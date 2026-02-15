import { buildDataSourceExplorer } from "./DataSourceExplorer.Designer";
import type { DataSourceExplorerProps } from "./DataSourceExplorer.Designer";

export type { DataSource, DataSourceCategory, ApiFieldSpec, DataSourceExplorerProps, DataSourceExplorerTabId } from "./DataSourceExplorer.Designer";

export const DataSourceExplorer = (props: DataSourceExplorerProps) => buildDataSourceExplorer(props);
