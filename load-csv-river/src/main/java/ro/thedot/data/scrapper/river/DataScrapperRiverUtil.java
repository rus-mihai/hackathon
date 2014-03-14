package ro.thedot.data.scrapper.river;

import static org.elasticsearch.common.xcontent.XContentFactory.jsonBuilder;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.PushbackInputStream;
import java.util.List;
import java.util.Map;

import org.elasticsearch.common.Strings;
import org.elasticsearch.common.xcontent.XContentBuilder;
import org.elasticsearch.common.xcontent.support.XContentMapValues;

import ro.thedot.data.scrapper.constants.ChannelsEnum;
import ro.thedot.data.scrapper.constants.FundCodesEnum;
import ro.thedot.data.scrapper.constants.LanguagesEnum;
import ro.thedot.data.scrapper.constants.DataScrapperRiverConstants;

/**
 * 
 * @author mihairus
 *
 */
public class DataScrapperRiverUtil {

  public static final String INDEX_TYPE_DOC = "doc";
  public static final String INDEX_TYPE_FOLDER = "folder";
  public static final String INDEX_TYPE_LX = "lxRiver";

  public static final String DOC_FIELD_NAME = "name";
  public static final String DOC_FIELD_DATE = "postDate";
  public static final String DOC_FIELD_PATH_ENCODED = "pathEncoded";
  public static final String DOC_FIELD_VIRTUAL_PATH = "virtualpath";
  public static final String DOC_FIELD_ROOT_PATH = "rootpath";

  public static final String DIR_FIELD_NAME = "name";
  public static final String DIR_FIELD_PATH_ENCODED = "pathEncoded";
  public static final String DIR_FIELD_VIRTUAL_PATH = "virtualpath";
  public static final String DIR_FIELD_ROOT_PATH = "rootpath";

  public static XContentBuilder buildLxFileMapping(final String type) throws Exception {
    final XContentBuilder xbMapping = jsonBuilder().prettyPrint().startObject().startObject(type).startObject("properties").startObject(DOC_FIELD_NAME)
        .field("type", "string").field("analyzer", "keyword").endObject().startObject(DOC_FIELD_PATH_ENCODED).field("type", "string")
        .field("analyzer", "keyword").endObject().startObject(DOC_FIELD_ROOT_PATH).field("type", "string").field("analyzer", "keyword").endObject()
        .startObject(DOC_FIELD_VIRTUAL_PATH).field("type", "string").field("analyzer", "keyword").endObject().startObject(DOC_FIELD_DATE).field("type", "date")
        .endObject().startObject("file").field("type", "attachment").startObject("fields").startObject("title").field("store", "yes").endObject()
        .startObject("file").field("term_vector", "with_positions_offsets").field("store", "yes").endObject().endObject().endObject().endObject().endObject()
        .endObject();
    return xbMapping;
  }

  public static XContentBuilder buildLxFolderMapping(final String type) throws Exception {
    final XContentBuilder xbMapping = jsonBuilder().prettyPrint().startObject().startObject(type).startObject("properties").startObject(DIR_FIELD_NAME)
        .field("type", "string").field("analyzer", "keyword").endObject().startObject(DIR_FIELD_PATH_ENCODED).field("type", "string")
        .field("analyzer", "keyword").endObject().startObject(DIR_FIELD_ROOT_PATH).field("type", "string").field("analyzer", "keyword").endObject()
        .startObject(DIR_FIELD_VIRTUAL_PATH).field("type", "string").field("analyzer", "keyword").endObject().endObject().endObject().endObject();

    return xbMapping;
  }

  public static XContentBuilder buildLxRiverMapping(final String type) throws Exception {
    final XContentBuilder xbMapping = jsonBuilder().prettyPrint().startObject().startObject(type).startObject("properties").startObject("scanDate")
        .field("type", "long").endObject().startObject("folders").startObject("properties").startObject("url").field("type", "string").endObject().endObject()
        .endObject().endObject().endObject().endObject();

    return xbMapping;
  }

  public static XContentBuilder buildLxFileMapping() throws Exception {
    return buildLxFileMapping(INDEX_TYPE_DOC);
  }

  public static XContentBuilder buildLxFolderMapping() throws Exception {
    return buildLxFolderMapping(INDEX_TYPE_FOLDER);
  }

  public static XContentBuilder buildLxRiverMapping() throws Exception {
    return buildLxRiverMapping(INDEX_TYPE_LX);
  }

  /**
   * Extract array from settings (array or ; delimited String)
   * 
   * @param settings
   *          Settings
   * @param path
   *          Path to definition : "lx.includes"
   * @return
   */
  @SuppressWarnings("unchecked")
  public static String[] buildArrayFromSettings(final Map<String, Object> settings, final String path) {
    String[] includes;

    // We manage comma separated format and arrays
    if (XContentMapValues.isArray(XContentMapValues.extractValue(path, settings))) {
      final List<String> includesarray = (List<String>) XContentMapValues.extractValue(path, settings);
      int i = 0;
      includes = new String[includesarray.size()];
      for (final String include : includesarray) {
        includes[i++] = Strings.trimAllWhitespace(include);
      }
    } else {
      final String includedef = (String) XContentMapValues.extractValue(path, settings);
      includes = Strings.commaDelimitedListToStringArray(Strings.trimAllWhitespace(includedef));
    }

    final String[] uniquelist = Strings.removeDuplicateStrings(includes);

    return uniquelist;
  }

  /**
   * We check if we can index the file or if we should ignore it
   * 
   * @param filename
   *          The filename to scan
   * @param includes
   *          include rules, may be empty not null
   * @param excludes
   *          exclude rules, may be empty not null
   * @return
   */
  public static boolean isIndexable(final String filename, final List<String> includes, final List<String> excludes) {
    // No rules ? Fine, we index everything
    if (includes.isEmpty() && excludes.isEmpty()) {
      return true;
    }

    // Exclude rules : we know that whatever includes rules are, we should exclude matching files
    for (final String exclude : excludes) {
      final String regex = exclude.replace("?", ".?").replace("*", ".*?");
      if (filename.matches(regex)) {
        return false;
      }
    }

    // Include rules : we should add document if it match include rules
    if (includes.isEmpty()) {
      return true;
    }

    for (final String include : includes) {
      final String regex = include.replace("?", ".?").replace("*", ".*?");
      if (filename.matches(regex)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detects the language of the file from its name.
   * 
   * @param filename
   *          - the name of the file
   * @return -s the language
   */
  public static String detectLanguage(final String filename) {
    for (final LanguagesEnum language : LanguagesEnum.values()) {
      if (filename.contains(language.getValue())) {
        return language.getValue();
      }
    }
    return DataScrapperRiverConstants.DEFAULT_LANGUAGE;
  }

  /**
   * Detects the channel of the file from its name.
   * 
   * @param filename
   *          - the name of the file
   * @return -s the channel
   */
  public static String detectChannel(final String filename) {
    for (final ChannelsEnum channel : ChannelsEnum.values()) {
      if (filename.contains(channel.getValue())) {
        return channel.getValue();
      }
    }
    return DataScrapperRiverConstants.DEFAULT_CHANNEL;
  }

  /**
   * Retrieves the fund code for the given file from its name.
   * 
   * @param filename
   *          - the name of the file
   * @return -s the fund code
   */
  public static String retrieveFundCode(final String filename) {
    for (final FundCodesEnum fundCode : FundCodesEnum.values()) {
      if (filename.contains(fundCode.getValue())) {
        return fundCode.getValue();
      }
    }
    return DataScrapperRiverConstants.DEFAULT_FUND_CODE;
  }

  /**
   * Retrieves stream no BOM
   * 
   * @param file
   * @return
   * @throws Exception
   */
  public static InputStream retrieveStreamNoBOM(final File file) throws Exception {
    final InputStream inputStream = new FileInputStream(file);
    final PushbackInputStream pushbackInputStream = new PushbackInputStream(new BufferedInputStream(inputStream), 3);
    final byte[] bom = new byte[3];
    if (pushbackInputStream.read(bom) != -1) {
      if (!(bom[0] == (byte) 0xEF && bom[1] == (byte) 0xBB && bom[2] == (byte) 0xBF)) {
        pushbackInputStream.unread(bom);
      }
    }
    return pushbackInputStream;
  }
}