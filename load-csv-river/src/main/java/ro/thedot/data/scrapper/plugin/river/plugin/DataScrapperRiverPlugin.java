package ro.thedot.data.scrapper.plugin.river.plugin;

import org.elasticsearch.common.inject.Inject;
import org.elasticsearch.common.inject.Module;
import org.elasticsearch.plugins.AbstractPlugin;
import org.elasticsearch.river.RiversModule;

import ro.thedot.data.scrapper.river.DataScrapperRiverModule;

/**
 * 
 * @author mihairus
 * 
 */
public class DataScrapperRiverPlugin extends AbstractPlugin {

  @Inject
  public DataScrapperRiverPlugin() {
  }

  @Override
  public String name() {
    return "river-scrapper";
  }

  @Override
  public String description() {
    return "River Data Scrapper Plugin";
  }

  @Override
  public void processModule(final Module module) {
    if (module instanceof RiversModule) {
      ((RiversModule) module).registerRiver("scrapper", DataScrapperRiverModule.class);
    }
  }
}
