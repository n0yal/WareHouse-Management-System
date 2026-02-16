import { WmsPlaceholderPage } from "./WmsPlaceholderPage";
export function ReturnsPage() {
    return (<WmsPlaceholderPage title="Returns" subtitle="Process inbound returns and disposition outcomes" primaryAction="Create Return Receipt" queueLabel="Returns Pending" queueCount={7}/>);
}
