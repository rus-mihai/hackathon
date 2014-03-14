package ro.thedot.data.scrapper.constants;

/**
 * Languages enum. Temporary solution.
 * 
 * @author nicoleta.chindris
 * 
 */
public enum LanguagesEnum {
  NL("nl"), EN("en"), FR("fr"), DE("de"), RO("ro");

  private String value;

  public String getValue() {
    return value;
  }

  private LanguagesEnum(final String value) {
    this.value = value;
  }
}