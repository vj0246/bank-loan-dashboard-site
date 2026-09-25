import Dashboard, { type DashboardData } from "./Dashboard";
import loanData from "./loan-aggregates.json";

export default function Home() {
  return <Dashboard data={loanData as DashboardData} />;
}
