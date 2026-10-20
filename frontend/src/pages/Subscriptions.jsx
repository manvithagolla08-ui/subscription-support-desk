import { useCallback, useEffect, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import api from "../services/api";
import "./Subscriptions.css";

const INCIDENT_LABELS = {
  INVESTIGATING: "Investigating",
  IDENTIFIED: "Identified",
  MONITORING: "Monitoring",
  RESOLVED: "Resolved",
};

const ACRONYMS = { ai: "AI", csv: "CSV", sso: "SSO" };

// "AI_ANSWER_ASSISTANT" -> "AI answer assistant"
function formatFeature(feature) {
  return String(feature)
    .toLowerCase()
    .split("_")
    .map((word, index) =>
      ACRONYMS[word] || (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word)
    )
    .join(" ");
}

async function loadPlanDetails(membership) {
  const org = membership.organizationId;
  const orgResult = await api.get(`/organizations/${org._id}`);
  const plan = orgResult.data?.planId;

  let entitlements = [];

  if (plan?._id) {
    try {
      const result = await api.get(`/entitlements/plan/${plan._id}`);
      entitlements = result.data || [];
    } catch {
      // The API returns 404 when a plan has no entitlements yet.
      entitlements = [];
    }
  }

  return {
    organizationId: org._id,
    organizationName: org.name,
    plan,
    entitlements,
  };
}

async function loadSubscriptions() {
  const mine = await api.get("/organizations/mine");
  const memberships = (mine.data || []).filter(
    (membership) => membership.organizationId
  );

  return Promise.all(memberships.map(loadPlanDetails));
}

function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [incidentError, setIncidentError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setSubscriptionError("");
    setIncidentError("");

    const [subscriptionResult, incidentResult] = await Promise.allSettled([
      loadSubscriptions(),
      api.get("/status"),
    ]);

    if (subscriptionResult.status === "fulfilled") {
      setSubscriptions(subscriptionResult.value);
    } else {
      setSubscriptionError(subscriptionResult.reason.message);
    }

    if (incidentResult.status === "fulfilled") {
      setIncidents(incidentResult.value.data || []);
    } else {
      setIncidentError(incidentResult.reason.message);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const activeIncidents = incidents.filter(
    (incident) => incident.status !== "RESOLVED"
  );

  return (
    <div className="subscriptions-page">
      <PageHeader
        title="Subscriptions"
        description="Your subscription plan, available features and service status."
        actions={
          <Button onClick={loadData} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        }
      />

      <h2 className="subscriptions-section-title">Subscription plan</h2>

      {loading && (
        <Card>
          <p>Loading...</p>
        </Card>
      )}

      {!loading && subscriptionError && (
        <Card>
          <p className="subscriptions-error">{subscriptionError}</p>
        </Card>
      )}

      {!loading && !subscriptionError && subscriptions.length === 0 && (
        <Card>
          <p>
            You are not a member of any organization yet. Ask your supervisor
            to add you.
          </p>
        </Card>
      )}

      {!loading &&
        subscriptions.map((subscription) => (
          <Card key={subscription.organizationId} className="subscription-card">
            <div className="subscription-card-header">
              <div>
                <h3>{subscription.organizationName}</h3>
                <p>{subscription.plan?.description || "No plan description."}</p>
              </div>
              <span className="plan-badge">
                {subscription.plan?.name || "No plan"}
              </span>
            </div>

            {subscription.entitlements.length === 0 ? (
              <p className="subscriptions-muted">
                No features are configured for this plan.
              </p>
            ) : (
              <ul className="feature-list">
                {subscription.entitlements.map((entitlement) => (
                  <li
                    key={entitlement._id}
                    className={entitlement.allowed ? "feature-on" : "feature-off"}
                  >
                    <span>{formatFeature(entitlement.feature)}</span>
                    <span className="feature-state">
                      {entitlement.allowed ? "Included" : "Locked"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}

      <h2 className="subscriptions-section-title">Service status</h2>

      {!loading && incidentError && (
        <Card>
          <p className="subscriptions-error">{incidentError}</p>
        </Card>
      )}

      {!loading && !incidentError && (
        <Card>
          <p
            className={
              activeIncidents.length
                ? "status-banner status-banner-bad"
                : "status-banner status-banner-ok"
            }
          >
            {activeIncidents.length
              ? `${activeIncidents.length} active incident${
                  activeIncidents.length > 1 ? "s" : ""
                }`
              : "All services operational"}
          </p>

          {incidents.length === 0 ? (
            <p className="subscriptions-muted">No incidents have been reported.</p>
          ) : (
            <ul className="incident-list">
              {incidents.map((incident, index) => (
                <li key={`${incident.title}-${index}`}>
                  <div className="incident-row">
                    <strong>{incident.title}</strong>
                    <span
                      className={`incident-status incident-${incident.status.toLowerCase()}`}
                    >
                      {INCIDENT_LABELS[incident.status] || incident.status}
                    </span>
                  </div>
                  <p className="incident-feature">Affects: {incident.feature}</p>
                  <p>{incident.description}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

export default Subscriptions;
