package ro.thedot.data.scrapper.river;

/**
 * Provide Scan Statistics
 * 
 * @author David Pilato (aka dadoonet)
 * 
 */
public class ScanStatistic {
  private int nbDocScan = 0;
  private int nbDocDeleted = 0;
  private String rootPath;
  private String rootPathId;

  public ScanStatistic() {
    rootPath = "/";
    nbDocScan = 0;
    nbDocDeleted = 0;
  }

  public ScanStatistic(final String rootPath) {
    this.rootPath = rootPath;
    nbDocScan = 0;
    nbDocDeleted = 0;
  }

  /**
   * @return the nbDocScan
   */
  public int getNbDocScan() {
    return nbDocScan;
  }

  /**
   * @param nbDocScan
   *          the nbDocScan to set
   */
  public void setNbDocScan(final int nbDocScan) {
    this.nbDocScan = nbDocScan;
  }

  /**
   * @return the nbDocDeleted
   */
  public int getNbDocDeleted() {
    return nbDocDeleted;
  }

  /**
   * @param nbDocDeleted
   *          the nbDocDeleted to set
   */
  public void setNbDocDeleted(final int nbDocDeleted) {
    this.nbDocDeleted = nbDocDeleted;
  }

  /**
   * @return the rootPath
   */
  public String getRootPath() {
    return rootPath;
  }

  /**
   * @param rootPath
   *          the rootPath to set
   */
  public void setRootPath(final String rootPath) {
    this.rootPath = rootPath;
  }

  /**
   * @return the rootPathId
   */
  public String getRootPathId() {
    return rootPathId;
  }

  /**
   * @param rootPathId
   *          the rootPathId to set
   */
  public void setRootPathId(final String rootPathId) {
    this.rootPathId = rootPathId;
  }

  /**
   * Increment statistic for new files
   */
  public void addFile() {
    nbDocScan++;
  }

  /**
   * Increment statistic for deleted files
   */
  public void removeFile() {
    nbDocDeleted++;
  }
}