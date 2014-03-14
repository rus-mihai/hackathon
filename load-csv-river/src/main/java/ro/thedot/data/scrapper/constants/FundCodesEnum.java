package ro.thedot.data.scrapper.constants;

/**
 * Fund codes enum. Temporary solution.
 * 
 * @author nicoleta.chindris
 * 
 */
public enum FundCodesEnum {
  REP001("REP001"), REP002("REP002"), REP003("REP003"), REP004("REP004");

  private String value;

  public String getValue() {
    return value;
  }

  private FundCodesEnum(final String value) {
    this.value = value;
  }
}