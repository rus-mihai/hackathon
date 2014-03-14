package ro.thedot.data.scrapper.river;

import org.elasticsearch.common.inject.AbstractModule;
import org.elasticsearch.river.River;

public class DataScrapperRiverModule extends AbstractModule {

  @Override
  protected void configure() {
    bind(River.class).to(DataScrapperRiver.class).asEagerSingleton();
  }
}