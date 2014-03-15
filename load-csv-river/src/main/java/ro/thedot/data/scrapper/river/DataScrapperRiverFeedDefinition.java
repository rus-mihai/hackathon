package ro.thedot.data.scrapper.river;

import java.util.ArrayList;
import java.util.List;

/**
 * 
 * @author mihairus
 * 
 */
public class DataScrapperRiverFeedDefinition {

  private String feedname;
  private String url;
  private int updateRate;
  private List<String> includes;
  private List<String> excludes;
  private final List<String> fields;

  public List<String> getFields() {
    return fields;
  }

  public DataScrapperRiverFeedDefinition() {
    this(null, null, 0, new ArrayList<String>(), new ArrayList<String>(), new ArrayList<String>());
  }

  public DataScrapperRiverFeedDefinition(final String feedname, final String url, final int updateRate) {
    this(feedname, url, updateRate, new ArrayList<String>(), new ArrayList<String>(), new ArrayList<String>());
  }

  public DataScrapperRiverFeedDefinition(final String feedname, final String url, final int updateRate, final List<String> includes,
      final List<String> excludes, final List<String> fields) {
    assert excludes != null;
    assert includes != null;
    this.includes = includes;
    this.excludes = excludes;
    this.feedname = feedname;
    this.url = url;
    this.updateRate = updateRate;
    this.fields = fields;
  }

  public String getFeedname() {
    return feedname;
  }

  public void setFeedname(final String feedname) {
    this.feedname = feedname;
  }

  public String getUrl() {
    return url;
  }

  public void setUrl(final String url) {
    this.url = url;
  }

  public int getUpdateRate() {
    return updateRate;
  }

  public void setUpdateRate(final int updateRate) {
    this.updateRate = updateRate;
  }

  public List<String> getExcludes() {
    return excludes;
  }

  public void setExcludes(final List<String> excludes) {
    this.excludes = excludes;
  }

  public List<String> getIncludes() {
    return includes;
  }

  public void setIncludes(final List<String> includes) {
    this.includes = includes;
  }

  public void addInclude(final String include) {
    includes.add(include);
  }

  public void addExclude(final String exclude) {
    excludes.add(exclude);
  }
}
