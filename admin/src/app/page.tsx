import { PanelPage } from "@/components/panel-page";
export const dynamic = "force-dynamic";
export default async function Page() { return await PanelPage({kind:"dashboard"}); }
