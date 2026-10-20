
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";

function Dashboard() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your subscription support desk."
      />

      <Card>
        <p>Welcome to your Subscription Support Desk!</p>
      </Card>
    </>
  );
}

export default Dashboard;
