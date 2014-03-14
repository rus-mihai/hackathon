package ro.thedot.data.scrapper.constants;

/**
 * Channels enum. Temporary solution.
 * 
 * @author nicoleta.chindris
 * 
 */
public enum ChannelsEnum {
  ROBECO("ROBECO"), RG_HOLLAND("RGHOLLAND"), BUSINESS("BUSINESS"), PRIVATE("PRIVATE");

  private String value;

  public String getValue() {
    return value;
  }

  private ChannelsEnum(final String value) {
    this.value = value;
  }
}