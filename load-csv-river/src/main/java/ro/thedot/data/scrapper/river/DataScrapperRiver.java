package ro.thedot.data.scrapper.river;

import static org.elasticsearch.common.xcontent.XContentFactory.jsonBuilder;

import java.io.File;
import java.io.FileInputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import net.sf.json.JSONArray;
import net.sf.json.JSONObject;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.elasticsearch.ExceptionsHelper;
import org.elasticsearch.action.bulk.BulkRequestBuilder;
import org.elasticsearch.action.bulk.BulkResponse;
import org.elasticsearch.action.get.GetResponse;
import org.elasticsearch.action.search.SearchResponse;
import org.elasticsearch.action.search.SearchType;
import org.elasticsearch.client.Client;
import org.elasticsearch.cluster.block.ClusterBlockException;
import org.elasticsearch.common.inject.Inject;
import org.elasticsearch.common.joda.time.format.ISODateTimeFormat;
import org.elasticsearch.common.util.concurrent.EsExecutors;
import org.elasticsearch.common.xcontent.XContentBuilder;
import org.elasticsearch.common.xcontent.support.XContentMapValues;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.indices.IndexAlreadyExistsException;
import org.elasticsearch.river.AbstractRiverComponent;
import org.elasticsearch.river.River;
import org.elasticsearch.river.RiverName;
import org.elasticsearch.river.RiverSettings;
import org.elasticsearch.search.SearchHit;

/**
 * 
 * @author mihairus
 * 
 */
public class DataScrapperRiver extends AbstractRiverComponent implements River {

  private final Client client;

  private final String indexName;

  private final String typeName;

  private final long bulkSize;

  private volatile Thread feedThread;

  private volatile boolean closed = false;

  private final DataScrapperRiverFeedDefinition lxDefinition;

  @SuppressWarnings("unchecked")
  @Inject
  public DataScrapperRiver(final RiverName riverName, final RiverSettings settings, final Client client) {
    super(riverName, settings);
    this.client = client;

    if (settings.settings().containsKey("lx")) {
      final Map<String, Object> feed = (Map<String, Object>) settings.settings().get("lx");

      final String feedname = XContentMapValues.nodeStringValue(feed.get("name"), null);
      final String url = XContentMapValues.nodeStringValue(feed.get("url"), null);

      final int updateRate = XContentMapValues.nodeIntegerValue(feed.get("update_rate"), 15 * 60 * 1000);

      final String[] includes = DataScrapperRiverUtil.buildArrayFromSettings(settings.settings(), "lx.includes");
      final String[] excludes = DataScrapperRiverUtil.buildArrayFromSettings(settings.settings(), "lx.excludes");
      final String[] fields = DataScrapperRiverUtil.buildArrayFromSettings(settings.settings(), "lx.fields");

      lxDefinition = new DataScrapperRiverFeedDefinition(feedname, url, updateRate, Arrays.asList(includes), Arrays.asList(excludes), Arrays.asList(fields));
    } else {
      final String url = "/esdir";
      logger.warn("You didn't define the lx url. Switching to defaults : [{}]", url);
      final int updateRate = 60 * 60 * 1000;
      lxDefinition = new DataScrapperRiverFeedDefinition("defaultlocaldir", url, updateRate, Arrays.asList("*.xml", "*.pdf"), Arrays.asList("*.exe"),
          Arrays.asList(""));
    }

    if (settings.settings().containsKey("index")) {
      final Map<String, Object> indexSettings = (Map<String, Object>) settings.settings().get("index");
      indexName = XContentMapValues.nodeStringValue(indexSettings.get("index"), riverName.name());
      typeName = XContentMapValues.nodeStringValue(indexSettings.get("type"), DataScrapperRiverUtil.INDEX_TYPE_DOC);
      bulkSize = XContentMapValues.nodeLongValue(indexSettings.get("bulk_size"), 100);
    } else {
      indexName = riverName.name();
      typeName = DataScrapperRiverUtil.INDEX_TYPE_DOC;
      bulkSize = 100;
    }
  }

  @Override
  public void start() {
    if (logger.isInfoEnabled()) {
      logger.info("Starting lx river scanning");
    }
    try {
      client.admin().indices().prepareCreate(indexName).execute().actionGet();
    } catch (final Exception e) {
      if (ExceptionsHelper.unwrapCause(e) instanceof IndexAlreadyExistsException) {
        // that's fine
      } else if (ExceptionsHelper.unwrapCause(e) instanceof ClusterBlockException) {
        // TODO:
      } else {
        logger.warn("failed to create index [{}], disabling river...", e, indexName);
        return;
      }
    }
    /*
     * try { // If needed, we create the new mapping for files pushMapping(indexName, typeName, DataScrapperRiverUtil.buildLxFileMapping(typeName)); } catch
     * (final Exception e) { logger.warn("failed to create mapping for [{}/{}], disabling river...", e, indexName, typeName); return; }
     */

    // We create as many Threads as there are feeds
    feedThread = EsExecutors.daemonThreadFactory(settings.globalSettings(), "lx_slurper").newThread(new LxParser(lxDefinition));
    feedThread.start();
  }

  @Override
  public void close() {
    if (logger.isInfoEnabled()) {
      logger.info("Closing lx river");
    }
    closed = true;

    // We have to close the Thread
    if (feedThread != null) {
      feedThread.interrupt();
    }
  }

  private class LxParser implements Runnable {
    private final DataScrapperRiverFeedDefinition lxdef;

    private BulkRequestBuilder bulk;
    private ScanStatistic stats;

    public LxParser(final DataScrapperRiverFeedDefinition lxDefinition) {
      lxdef = lxDefinition;
      if (logger.isInfoEnabled()) {
        logger.info("creating lx river [{}] for [{}] every [{}] ms", lxdef.getFeedname(), lxdef.getUrl(), lxdef.getUpdateRate());
      }
    }

    @Override
    public void run() {
      while (true) {
        if (closed) {
          return;
        }

        try {
          stats = new ScanStatistic(lxdef.getUrl());

          final File directory = new File(lxdef.getUrl());

          if (!directory.exists()) {
            throw new RuntimeException(lxdef.getUrl() + " doesn't exists.");
          }

          final String rootPathId = directory.getAbsolutePath();
          stats.setRootPathId(rootPathId);

          bulk = client.prepareBulk();

          final String lastupdateField = "_lastupdated";
          final Date scanDatenew = new Date();
          final Date scanDate = getLastDateFromRiver(lastupdateField);

          // We only index the root directory once (first run)
          // That means that we don't have a scanDate yet
          if (scanDate == null) {
            indexRootDirectory(directory);
          }

          addFilesRecursively(directory, scanDate);

          updateLxRiver(lastupdateField, scanDatenew);

          // If some bulkActions remains, we should commit them
          commitBulk();

        } catch (final Exception e) {
          logger.warn("Error while indexing content from {}", lxdef.getUrl());
          if (logger.isDebugEnabled()) {
            logger.debug("Exception for {} is {}", lxdef.getUrl(), e);
          }
        }

        try {
          if (logger.isDebugEnabled()) {
            logger.debug("Lx river is going to sleep for {} ms", lxdef.getUpdateRate());
          }
          Thread.sleep(lxdef.getUpdateRate());
        } catch (final InterruptedException e1) {
        }
      }
    }

    @SuppressWarnings("unchecked")
    private Date getLastDateFromRiver(final String lastupdateField) {
      Date lastDate = null;
      try {
        // Do something
        client.admin().indices().prepareRefresh("_river").execute().actionGet();
        final GetResponse lastSeqGetResponse = client.prepareGet("_river", riverName().name(), lastupdateField).execute().actionGet();
        if (lastSeqGetResponse.isExists()) {
          final Map<String, Object> lxState = (Map<String, Object>) lastSeqGetResponse.getSourceAsMap().get("lx");

          if (lxState != null) {
            final Object lastupdate = lxState.get("lastdate");
            if (lastupdate != null) {
              final String strLastDate = lastupdate.toString();
              lastDate = ISODateTimeFormat.dateOptionalTimeParser().parseDateTime(strLastDate).toDate();
            }
          }
        } else {
          // First call
          if (logger.isDebugEnabled()) {
            logger.debug("{} doesn't exist", lastupdateField);
          }
        }
      } catch (final Exception e) {
        logger.warn("failed to get _lastupdate, throttling....", e);
      }
      return lastDate;
    }

    private void updateLxRiver(final String lastupdateField, final Date scanDate) throws Exception {
      // We store the lastupdate date and some stats
      final XContentBuilder xb = jsonBuilder().startObject().startObject("lx").field("feedname", lxdef.getFeedname()).field("lastdate", scanDate)
          .field("docadded", stats.getNbDocScan()).field("docdeleted", stats.getNbDocDeleted()).endObject().endObject();
      esIndex("_river", riverName.name(), lastupdateField, xb);
    }

    /**
     * Commit to ES if something is in queue
     * 
     * @throws Exception
     */
    private void commitBulk() throws Exception {
      if (bulk != null && bulk.numberOfActions() > 0) {
        if (logger.isDebugEnabled()) {
          logger.debug("ES Bulk Commit is needed");
        }
        final BulkResponse response = bulk.execute().actionGet();
        if (response.hasFailures()) {
          logger.warn("Failed to execute " + response.buildFailureMessage());
        }
      }
    }

    /**
     * Commit to ES if we have too much in bulk
     * 
     * @throws Exception
     */
    private void commitBulkIfNeeded() throws Exception {
      if (bulk != null && bulk.numberOfActions() > 0 && bulk.numberOfActions() >= bulkSize) {
        if (logger.isDebugEnabled()) {
          logger.debug("ES Bulk Commit is needed");
        }

        final BulkResponse response = bulk.execute().actionGet();
        if (response.hasFailures()) {
          logger.warn("Failed to execute " + response.buildFailureMessage());
        }

        // Reinit a new bulk
        bulk = client.prepareBulk();
      }
    }

    private String computeVirtualPathName(final ScanStatistic stats, final String realPath) {
      if (realPath == null) {
        return null;
      }

      if (realPath.length() < stats.getRootPath().length()) {
        return "/";
      }

      return realPath.substring(stats.getRootPath().length() - 1).replace(File.separator, "/");
    }

    private void addFilesRecursively(final File path, final Date lastScanDate) throws Exception {

      final File[] children = path.listFiles();
      final Collection<String> lxFiles = new ArrayList<String>();
      final Collection<String> lxFolders = new ArrayList<String>();

      if (children != null) {

        for (final File child : children) {

          if (child.isFile()) {
            final String filename = child.getName();

            if (DataScrapperRiverUtil.isIndexable(filename, lxdef.getIncludes(), lxdef.getExcludes())) {
              lxFiles.add(filename);
              if (lastScanDate == null || child.lastModified() > lastScanDate.getTime()) {
                indexFile(stats, child);
                stats.addFile();
              }
            }
          } else if (child.isDirectory()) {
            lxFolders.add(child.getName());
            indexDirectory(stats, child);
            addFilesRecursively(child, lastScanDate);
          } else {
            if (logger.isDebugEnabled()) {
              logger.debug("Not a file nor a dir. Skipping {}", child.getAbsolutePath());
            }
          }
        }
      }

      // TODO Optimize
      // if (path.isDirectory() && path.lastModified() > lastScanDate
      // && lastScanDate != 0) {

      if (path.isDirectory()) {
        final Collection<String> esFiles = getFileDirectory(path.getAbsolutePath());

        // for the delete files
        for (final String esfile : esFiles) {
          if (DataScrapperRiverUtil.isIndexable(esfile, lxdef.getIncludes(), lxdef.getExcludes()) && !lxFiles.contains(esfile)) {
            final File file = new File(path.getAbsolutePath().concat(File.separator).concat(esfile));
            esDelete(indexName, typeName, file.getAbsolutePath());
            stats.removeFile();
          }
        }

        final Collection<String> esFolders = getFolderDirectory(path.getAbsolutePath());

        // for the delete folder
        for (final String esfolder : esFolders) {

          if (!lxFolders.contains(esfolder)) {

            removeEsDirectoryRecursively(path.getAbsolutePath(), esfolder);
          }
        }

        // for the older files
        for (final String lxFile : lxFiles) {

          final File file = new File(path.getAbsolutePath().concat(File.separator).concat(lxFile));

          if (DataScrapperRiverUtil.isIndexable(lxFile, lxdef.getIncludes(), lxdef.getExcludes())) {
            if (!esFiles.contains(lxFile) && (lastScanDate == null || file.lastModified() < lastScanDate.getTime())) {
              indexFile(stats, file);
              stats.addFile();
            }
          }
        }
      }
    }

    private Collection<String> getFileDirectory(final String path) throws Exception {
      final Collection<String> files = new ArrayList<String>();

      final SearchResponse response = client.prepareSearch(indexName).setSearchType(SearchType.QUERY_AND_FETCH).setTypes(typeName)
          .setQuery(QueryBuilders.termQuery(DataScrapperRiverUtil.DOC_FIELD_PATH_ENCODED, path)).setFrom(0).setSize(50000).execute().actionGet();

      if (response.getHits() != null && response.getHits().getHits() != null) {
        for (final SearchHit hit : response.getHits().getHits()) {
          final String name = hit.getSource().get(DataScrapperRiverUtil.DOC_FIELD_NAME).toString();
          files.add(name);
        }
      }

      return files;

    }

    private Collection<String> getFolderDirectory(final String path) throws Exception {
      final Collection<String> files = new ArrayList<String>();

      final SearchResponse response = client.prepareSearch(indexName).setSearchType(SearchType.QUERY_AND_FETCH)
          .setTypes(DataScrapperRiverUtil.INDEX_TYPE_FOLDER).setQuery(QueryBuilders.termQuery(DataScrapperRiverUtil.DIR_FIELD_PATH_ENCODED, path)).setFrom(0)
          .setSize(50000).execute().actionGet();

      if (response.getHits() != null && response.getHits().getHits() != null) {
        for (final SearchHit hit : response.getHits().getHits()) {
          final String name = hit.getSource().get(DataScrapperRiverUtil.DIR_FIELD_NAME).toString();
          files.add(name);
        }
      }

      return files;

    }

    /**
     * Index a file
     * 
     * @param stats
     * @param file
     * @throws Exception
     */
    private void indexFile(final ScanStatistic stats, final File file) throws Exception {
      // final InputStream inputStream = DataScrapperRiverUtil.retrieveStreamNoBOM(file);
      // final XMLSerializer xmlSerializer = new XMLSerializer();
      // final JSON jsonO = xmlSerializer.readFromStream(inputStream);

      final FileInputStream excelFile = new FileInputStream(file);
      final Workbook exWorkBook = WorkbookFactory.create(excelFile);

      final Sheet sheet = exWorkBook.getSheetAt(0);
      // Iterate through each rows one by one
      final Iterator<Row> rowIterator = sheet.iterator();
      Map<Integer, String> createKeyMap = null;
      final Map<String, Object> filesMap = new HashMap<String, Object>();
      final JSONArray jsonArray = new JSONArray();
      while (rowIterator.hasNext()) {
        final Row row = rowIterator.next();
        if (row.getRowNum() == 0) {
          createKeyMap = createKeyMap(row);
        } else {
          final JSONObject object = new JSONObject();
          final Iterator<Cell> cellIterator = row.cellIterator();
          while (cellIterator.hasNext()) {
            final Cell cell = cellIterator.next();
            if (createKeyMap.keySet().contains(cell.getColumnIndex())) {
              switch (cell.getCellType()) {
              case Cell.CELL_TYPE_NUMERIC:
                try {
                  object.put(createKeyMap.get(cell.getColumnIndex()), cell.getNumericCellValue());
                } catch (final Exception e) {
                  // TODO: handle exception
                }
                break;
              case Cell.CELL_TYPE_STRING:
                try {
                  object.put(createKeyMap.get(cell.getColumnIndex()), cell.getStringCellValue());
                } catch (final Exception e) {
                  // TODO: handle exception
                }
                break;
              }
            }
          }
          // jsonArray.add(object);
          // filesMap.put("results", jsonArray);
          bulk.add(client.prepareIndex(indexName, typeName, object.get(createKeyMap.get(0)).toString()).setSource(object));
        }
      }
      excelFile.close();
      // final String contentAsString = jsonO.toString().replace("@", "");
      // final JSONArray jsonArray = JSONArray.fromObject(contentAsString);
      //
      // final String fileName = file.getName();
      // final String detectLanguage = DataScrapperRiverUtil.detectLanguage(fileName);
      // filesMap.put("language", detectLanguage);
      // final String detectChannel = DataScrapperRiverUtil.detectChannel(fileName);
      // filesMap.put("channel", detectChannel);
      // final String retrieveFundCode = DataScrapperRiverUtil.retrieveFundCode(fileName);
      // filesMap.put("fund", retrieveFundCode);
      //
      commitBulkIfNeeded();
    }

    private Map<Integer, String> createKeyMap(final Row row) {
      final List<String> fields = lxDefinition.getFields();

      final Iterator<Cell> cellIterator = row.cellIterator();
      final Map<Integer, String> values = new LinkedHashMap<Integer, String>();

      while (cellIterator.hasNext()) {
        final Cell cell = cellIterator.next();
        for (final String field : fields) {
          if (cell.getStringCellValue().equals(field)) {
            values.put(cell.getColumnIndex(), field);
          }
        }
      }
      return values;

    }

    /**
     * Index a directory
     * 
     * @param stats
     * @param file
     * @throws Exception
     */
    private void indexDirectory(final ScanStatistic stats, final File file) throws Exception {
      esIndex(
          indexName,
          DataScrapperRiverUtil.INDEX_TYPE_FOLDER,
          file.getAbsolutePath(),
          jsonBuilder().startObject().field(DataScrapperRiverUtil.DIR_FIELD_NAME, file.getName())
              .field(DataScrapperRiverUtil.DIR_FIELD_ROOT_PATH, stats.getRootPathId())
              .field(DataScrapperRiverUtil.DIR_FIELD_VIRTUAL_PATH, computeVirtualPathName(stats, file.getParent()))
              .field(DataScrapperRiverUtil.DIR_FIELD_PATH_ENCODED, file.getParent()).endObject());
    }

    /**
     * Add the root directory as a folder
     * 
     * @param stats
     * @param file
     * @throws Exception
     */
    private void indexRootDirectory(final File file) throws Exception {
      esIndex(
          indexName,
          DataScrapperRiverUtil.INDEX_TYPE_FOLDER,
          file.getAbsolutePath(),
          jsonBuilder().startObject().field(DataScrapperRiverUtil.DIR_FIELD_NAME, file.getName())
              .field(DataScrapperRiverUtil.DIR_FIELD_ROOT_PATH, stats.getRootPathId()).field(DataScrapperRiverUtil.DIR_FIELD_VIRTUAL_PATH, (String) null)
              .field(DataScrapperRiverUtil.DIR_FIELD_PATH_ENCODED, file.getParent()).endObject());
    }

    /**
     * Remove a full directory and sub dirs recursively
     * 
     * @param path
     * @param name
     * @throws Exception
     */
    private void removeEsDirectoryRecursively(final String path, final String name) throws Exception {

      final String fullPath = path.concat(File.separator).concat(name);

      logger.debug("Delete folder " + fullPath);
      final Collection<String> listFile = getFileDirectory(fullPath);

      for (final String esfile : listFile) {
        esDelete(indexName, typeName, fullPath.concat(File.separator).concat(esfile));
      }

      final Collection<String> listFolder = getFolderDirectory(fullPath);

      for (final String esfolder : listFolder) {
        removeEsDirectoryRecursively(fullPath, esfolder);
      }

      esDelete(indexName, DataScrapperRiverUtil.INDEX_TYPE_FOLDER, fullPath);

    }

    /**
     * Add to bulk an IndexRequest
     * 
     * @param index
     * @param type
     * @param id
     * @param xb
     * @throws Exception
     */
    private void esIndex(final String index, final String type, final String id, final XContentBuilder xb) throws Exception {
      if (logger.isDebugEnabled()) {
        logger.debug("Indexing in ES " + index + ", " + type + ", " + id);
      }
      if (logger.isTraceEnabled()) {
        logger.trace("JSon indexed : {}", xb.string());
      }

      bulk.add(client.prepareIndex(index, type, id).setSource(xb));
      commitBulkIfNeeded();
    }

    /**
     * Add to bulk a DeleteRequest
     * 
     * @param index
     * @param type
     * @param id
     * @throws Exception
     */
    private void esDelete(final String index, final String type, final String id) throws Exception {
      if (logger.isDebugEnabled()) {
        logger.debug("Deleting from ES " + index + ", " + type + ", " + id);
      }
      bulk.add(client.prepareDelete(index, type, id));
      commitBulkIfNeeded();
    }
  }
}