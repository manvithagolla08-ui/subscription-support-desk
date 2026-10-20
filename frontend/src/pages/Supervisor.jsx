import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";

export default function Supervisor() {
    const [plans, setPlans] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [users, setUsers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [members, setMembers] = useState([]);

    const [selectedOrgId, setSelectedOrgId] = useState("");
    const [customerOrgId, setCustomerOrgId] = useState("");
    const [customerId, setCustomerId] = useState("");

    const [name, setName] = useState("");
    const [planId, setPlanId] = useState("");
    const [orgId, setOrgId] = useState("");
    const [userId, setUserId] = useState("");
    const [role, setRole] = useState("SPECIALIST");

    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [membersLoading, setMembersLoading] = useState(false);

    
async function loadData() {
    try {
        setLoading(true);
        setMessage("");

        const [p, o, u] = await Promise.all([
            apiRequest("/plans"),
            apiRequest("/organizations"),
            apiRequest("/organizations/available-users")
        ]);

        setPlans(Array.isArray(p.data) ? p.data : []);
        setOrganizations(Array.isArray(o.data) ? o.data : []);
        setUsers(Array.isArray(u.data) ? u.data : []);

        if (p.data?.length) {
            setPlanId(previous => previous || p.data[0]._id);
        }

        if (o.data?.length) {
            setOrgId(previous => previous || o.data[0]._id);
            setCustomerOrgId(previous => previous || o.data[0]._id);
        }

        try {
            const c = await apiRequest(
                "/organizations/available-customers"
            );

            console.log("Available customers response:", c);
            setCustomers(Array.isArray(c.data) ? c.data : []);
        } catch (err) {
            console.error("Could not load customers:", err);
            setCustomers([]);
            setMessage(
                "Could not load customers. Check the browser console."
            );
        }
    } catch (err) {
        console.error("Could not load Supervisor data:", err);
        setMessage(err.message || "Could not load Supervisor data.");
    } finally {
        setLoading(false);
    }
}


    useEffect(() => {
        loadData();
    }, []);

    async function createOrganization(event) {
        event.preventDefault();
        setMessage("");

        try {
            await apiRequest("/organizations", {
                method: "POST",
                body: JSON.stringify({ name, planId })
            });

            setName("");
            setMessage("Organization created successfully.");
            await loadData();
        } catch (err) {
            setMessage(err.message || "Could not create organization.");
        }
    }

    async function assignMember(event) {
        event.preventDefault();
        setMessage("");

        try {
            await apiRequest(`/organizations/${orgId}/members`, {
                method: "POST",
                body: JSON.stringify({ userId, role })
            });

            setMessage("Staff member assigned successfully.");
            setUserId("");

            if (selectedOrgId === orgId) {
                await viewMembers(orgId);
            }

            await loadData();
        } catch (err) {
            setMessage(err.message || "Could not assign staff member.");
        }
    }

    async function assignCustomer(event) {
        event.preventDefault();
        setMessage("");

        try {
            await apiRequest(`/organizations/${customerOrgId}/members`, {
                method: "POST",
                body: JSON.stringify({
                    userId: customerId,
                    role: "CUSTOMER"
                })
            });

            setMessage("Customer added to organization successfully.");
            setCustomerId("");

            if (selectedOrgId === customerOrgId) {
                await viewMembers(customerOrgId);
            }

            await loadData();
        } catch (err) {
            setMessage(err.message || "Could not add customer.");
        }
    }

    async function viewMembers(organizationId) {
        setMessage("");
        setSelectedOrgId(organizationId);
        setMembers([]);
        setMembersLoading(true);

        try {
            const response = await apiRequest(
                `/organizations/${organizationId}/members`
            );

            setMembers(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            setMessage(err.message || "Could not load organization members.");
        } finally {
            setMembersLoading(false);
        }
    }

    async function removeMember(membershipId) {
        const confirmed = window.confirm(
            "Are you sure you want to remove this member from the organization?"
        );

        if (!confirmed) return;

        setMessage("");

        try {
            await apiRequest(
                `/organizations/${selectedOrgId}/members/${membershipId}`,
                { method: "DELETE" }
            );

            setMessage("Member removed successfully.");
            await viewMembers(selectedOrgId);
            await loadData();
        } catch (err) {
            setMessage(err.message || "Could not remove member.");
        }
    }

    if (loading) {
        return <p>Loading Supervisor page...</p>;
    }

    return (
        <div style={{ maxWidth: 900, padding: 24 }}>
            <h1>Supervisor Management</h1>

            {message && <p role="status">{message}</p>}

            <section style={{ marginBottom: 32 }}>
                <h2>Create Organization</h2>

                <form onSubmit={createOrganization}>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Organization name"
                        required
                    />

                    <select
                        value={planId}
                        onChange={e => setPlanId(e.target.value)}
                        required
                    >
                        <option value="">Select a plan</option>
                        {plans.map(plan => (
                            <option key={plan._id} value={plan._id}>
                                {plan.name}
                            </option>
                        ))}
                    </select>

                    <button type="submit" disabled={!plans.length}>
                        Create Organization
                    </button>
                </form>

                {!plans.length && (
                    <p>Create a plan first before creating an organization.</p>
                )}
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2>Existing Organizations</h2>

                {organizations.length === 0 ? (
                    <p>No organizations created yet.</p>
                ) : (
                    <ul>
                        {organizations.map(org => (
                            <li key={org._id} style={{ marginBottom: 12 }}>
                                <strong>{org.name}</strong>
                                {" — Plan: "}
                                {org.planId?.name || "Unknown"}
                                {" "}

                                <button
                                    type="button"
                                    onClick={() => viewMembers(org._id)}
                                >
                                    View Members
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {selectedOrgId && (
                <section style={{ marginBottom: 32 }}>
                    <h2>
                        Organization Members —{" "}
                        {organizations.find(
                            org => org._id === selectedOrgId
                        )?.name}
                    </h2>

                    {membersLoading ? (
                        <p>Loading members...</p>
                    ) : members.length === 0 ? (
                        <p>No members found for this organization.</p>
                    ) : (
                        <ul>
                            {members.map(member => {
                                const memberUser = member.userId;

                                return (
                                    <li
                                        key={member._id}
                                        style={{ marginBottom: 12 }}
                                    >
                                        <strong>
                                            {memberUser?.name || "Unknown user"}
                                        </strong>
                                        {" — "}
                                        {memberUser?.email || "No email"}
                                        {" — Role: "}
                                        {member.role ||
                                            memberUser?.role ||
                                            "Unknown"}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeMember(member._id)
                                            }
                                            style={{ marginLeft: 12 }}
                                        >
                                            Remove
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    <button
                        type="button"
                        onClick={() => {
                            setSelectedOrgId("");
                            setMembers([]);
                        }}
                    >
                        Close Members
                    </button>
                </section>
            )}

            <section style={{ marginBottom: 32 }}>
                <h2>Assign Staff to Organization</h2>

                <form onSubmit={assignMember}>
                    <label>
                        Organization
                        <select
                            value={orgId}
                            onChange={e => setOrgId(e.target.value)}
                            required
                        >
                            <option value="">Select organization</option>
                            {organizations.map(org => (
                                <option key={org._id} value={org._id}>
                                    {org.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <br />
                    <br />

                    <label>
                        Staff role
                        <select
                            value={role}
                            onChange={e => {
                                setRole(e.target.value);
                                setUserId("");
                            }}
                        >
                            <option value="SPECIALIST">Specialist</option>
                            <option value="KNOWLEDGE_MANAGER">
                                Knowledge Manager
                            </option>
                        </select>
                    </label>

                    <br />
                    <br />

                    <label>
                        Staff account
                        <select
                            value={userId}
                            onChange={e => setUserId(e.target.value)}
                            required
                        >
                            <option value="">Select staff account</option>
                            {users
                                .filter(user => user.role === role)
                                .map(user => (
                                    <option key={user._id} value={user._id}>
                                        {user.name} ({user.email})
                                    </option>
                                ))}
                        </select>
                    </label>

                    <br />
                    <br />

                    <button
                        type="submit"
                        disabled={!orgId || !userId}
                    >
                        Assign Staff
                    </button>
                </form>
            </section>

            <section style={{ marginBottom: 32 }}>
                <h2>Add Customer to Organization</h2>

                <form onSubmit={assignCustomer}>
                    <label>
                        Organization
                        <select
                            value={customerOrgId}
                            onChange={e => setCustomerOrgId(e.target.value)}
                            required
                        >
                            <option value="">Select organization</option>
                            {organizations.map(org => (
                                <option key={org._id} value={org._id}>
                                    {org.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <br />
                    <br />

                    <label>
                        Customer account
                        <select
                            value={customerId}
                            onChange={e => setCustomerId(e.target.value)}
                            required
                        >
                            <option value="">Select customer</option>
                            {customers.map(customer => (
                                <option key={customer._id} value={customer._id}>
                                    {customer.name} ({customer.email})
                                </option>
                            ))}
                        </select>
                    </label>

                    <br />
                    <br />

                    <button
                        type="submit"
                        disabled={!customerOrgId || !customerId}
                    >
                        Add Customer
                    </button>
                </form>

                {customers.length === 0 && (
                    <p>No customer accounts are currently available.</p>
                )}
            </section>
        </div>
    );
}