import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { PageHeading, LoadingState, ErrorState } from "../components/AdminPrimitives.jsx";
import {
  assignUserRoles,
  createRole,
  getPermissions,
  getRoles,
  getUserPermissions,
  getUsers,
  updateRole,
  updateUserPermissions,
} from "./accessApi.js";

const moduleLabels = {
  admin: "Administration",
  catalog: "Catalog",
  inventory: "Inventory",
  orders: "Orders",
  customers: "Customers",
  promotions: "Coupons and promotions",
  marketing: "Marketing",
  analytics: "Analytics",
  settings: "Settings",
  audit: "Audit history",
};

function PermissionModules({ permissions, selected, onToggle, disabled = false }) {
  const modules = permissions.reduce((result, permission) => {
    const module = permission.code.split(".")[0] || "other";
    (result[module] ||= []).push(permission);
    return result;
  }, {});
  return (
    <div className="admin-permission-modules">
      {Object.entries(modules).map(([module, items]) => {
        const selectedCount = items.filter((item) => selected.includes(item.code)).length;
        return (
          <section className="admin-permission-module" key={module}>
            <header className="admin-permission-module-header">
              <div><strong>{moduleLabels[module] || module}</strong><small>{selectedCount} of {items.length} enabled</small></div>
              <label><input type="checkbox" checked={selectedCount === items.length} disabled={disabled} onChange={() => onToggle(items.map((item) => item.code))} /> Select all</label>
            </header>
            <div className="admin-permission-module-list">
              {items.map((permission) => (
                <label className="admin-permission-option" key={permission.code}>
                  <span><strong>{permission.code}</strong><small>{permission.description}</small></span>
                  <input type="checkbox" checked={selected.includes(permission.code)} disabled={disabled} onChange={() => onToggle([permission.code])} />
                </label>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function Access({ onNotify }) {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedRolePermissions, setSelectedRolePermissions] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserRoles, setSelectedUserRoles] = useState([]);
  const [initialUserRoles, setInitialUserRoles] = useState([]);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState([]);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [usersError, setUsersError] = useState("");
  const [saving, setSaving] = useState(false);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [userPickerSearch, setUserPickerSearch] = useState("");
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [userAccessOpen, setUserAccessOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setFailed(false);
    setLoadError("");
    setUsersError("");
    const [roleResult, permissionResult, userResult] = await Promise.all([
      getRoles(),
      getPermissions(),
      getUsers(),
    ]);
    if (!roleResult.success || !permissionResult.success) {
      setLoadError(
        roleResult.message || permissionResult.message || "Could not load roles and permissions.",
      );
      setFailed(true);
      setLoading(false);
      return;
    }
    const nextRoles = roleResult.data?.data || [];
    setRoles(nextRoles);
    setPermissions(permissionResult.data?.data || []);
    setUsers(userResult.success ? userResult.data?.data || [] : []);
    if (!userResult.success) {
      setUsersError(userResult.message || "Could not load user accounts.");
    }
    setSelectedRoleId((current) => current || nextRoles[0]?.id || "");
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const selectedRole = roles.find((role) => role.id === selectedRoleId);
  useEffect(() => {
    setSelectedRolePermissions(
      (selectedRole?.permissions || []).map((permission) => permission.code),
    );
  }, [selectedRoleId, roles]);

  const selectUser = async (userId) => {
    setSelectedUserId(userId);
    if (!userId) {
      setSelectedUserRoles([]);
      setInitialUserRoles([]);
      setSelectedUserPermissions([]);
      return;
    }
    setSelectedUserRoles([]);
    setInitialUserRoles([]);
    setSelectedUserPermissions([]);
    const result = await getUserPermissions(userId);
    if (!result.success) {
      onNotify(result.message || "Could not load user access.");
      return false;
    }
    const access = result.data?.data;
    const roleIds = (access?.roles || []).map((role) => String(role.id));
    setSelectedUserRoles(roleIds);
    setInitialUserRoles(roleIds);
    setSelectedUserPermissions(access?.directPermissions || []);
    return true;
  };

  const toggle = (list, setList, value) =>
    setList((current) =>
      current.includes(String(value))
        ? current.filter((item) => item !== String(value))
        : [...current, String(value)],
    );

  const toggleMany = (list, setList, values) => {
    const allSelected = values.every((value) => list.includes(value));
    setList(
      allSelected
        ? list.filter((value) => !values.includes(value))
        : [...new Set([...list, ...values])],
    );
  };

  const saveRole = async (event) => {
    event.preventDefault();
    setSaving(true);
    const result = await updateRole(selectedRoleId, {
      description: selectedRole?.description || "",
      permissions: selectedRolePermissions,
    });
    setSaving(false);
    if (!result.success) {
      onNotify(result.message || "Could not save role permissions.");
      return;
    }
    onNotify("Role permissions saved.");
    await load();
  };

  const addRole = async (event) => {
    event.preventDefault();
    setSaving(true);
    const result = await createRole({
      name: roleName,
      description: roleDescription,
      permissions: [],
    });
    setSaving(false);
    if (!result.success) {
      onNotify(result.message || "Could not create role.");
      return false;
    }
    setRoleName("");
    setRoleDescription("");
    onNotify("Role created.");
    await load();
    if (result.data?.data?.id) setSelectedRoleId(result.data.data.id);
    return true;
  };

  const saveUserAccess = async (event) => {
    event.preventDefault();
    if (!selectedUserId || !selectedUserRoles.length) {
      onNotify("Choose at least one role for this account.");
      return;
    }
    setSaving(true);
    const rolesChanged =
      [...selectedUserRoles].sort().join("|") !==
      [...initialUserRoles].sort().join("|");
    if (rolesChanged) {
      const roleResult = await assignUserRoles(selectedUserId, selectedUserRoles);
      if (!roleResult.success) {
        setSaving(false);
        onNotify(roleResult.message || "Could not update user roles.");
        return;
      }
      setInitialUserRoles([...selectedUserRoles]);
    }
    const permissionResult = await updateUserPermissions(
      selectedUserId,
      selectedUserPermissions,
    );
    setSaving(false);
    if (!permissionResult.success) {
      onNotify(permissionResult.message || "Roles saved, but direct permissions failed.");
      return;
    }
    onNotify("User access saved.");
    await selectUser(selectedUserId);
  };

  if (loading) return <LoadingState label="Loading roles and permissions" />;
  if (failed) return <ErrorState retry={load} message={loadError} />;
  const userFilter = userPickerSearch.trim().toLowerCase();
  const filteredUsers = users.filter((user) =>
    `${user.name || ""} ${user.phone || ""} ${user.email || ""}`
      .toLowerCase()
      .includes(userFilter),
  );

  return (
    <div className="admin-page-content">
      <PageHeading
        eyebrow="ACCESS CONTROL"
        title="Roles and permissions"
        description="Manage role permissions and the access granted to each account."
      />
      <section className="admin-panel admin-settings-panel">
        <div className="admin-panel-heading">
          <div><h2>Role permissions</h2><p>Role grants apply to every account assigned to that role.</p></div>
        </div>
        {usersError && <p role="status">User accounts could not be loaded: {usersError}</p>}
        <label className="admin-form-label">
          Role
          <select value={selectedRoleId} onChange={(event) => setSelectedRoleId(event.target.value)}>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
        </label>
        {selectedRole && (
          <form onSubmit={saveRole}>
            <PermissionModules
              permissions={permissions}
              selected={selectedRolePermissions}
              onToggle={(codes) => toggleMany(selectedRolePermissions, setSelectedRolePermissions, codes)}
              disabled={selectedRole.name === "admin"}
            />
            {selectedRole.name === "admin" ? (
              <p>The built-in administrator role is locked.</p>
            ) : (
              <button className="admin-button admin-button-dark" disabled={saving}>{saving ? "Saving…" : "Save role permissions"}</button>
            )}
          </form>
        )}
      </section>

      <section className="admin-panel admin-settings-panel">
        <div className="admin-panel-heading">
          <div><h2>Individual user access</h2><p>Direct grants add to permissions inherited from roles.</p></div>
        </div>
        <div className="admin-access-user-picker">
          <div><strong>{users.find((user) => String(user.id) === String(selectedUserId))?.name || "No account selected"}</strong><small>{users.find((user) => String(user.id) === String(selectedUserId))?.phone || "Choose an account to manage its access."}</small></div>
          <div className="admin-access-user-actions"><button type="button" className="admin-button admin-button-secondary" disabled={Boolean(usersError)} onClick={() => { setUserPickerSearch(""); setUserPickerOpen(true); }}>Choose account</button>{selectedUserId && <button type="button" className="admin-button admin-button-dark" onClick={() => setUserAccessOpen(true)}>Edit access</button>}</div>
        </div>
        {selectedUserId && userAccessOpen && (
          <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setUserAccessOpen(false)}><form className="admin-modal admin-access-editor-modal" onSubmit={saveUserAccess}>
            <div className="admin-modal-header"><div><span className="admin-eyebrow">INDIVIDUAL USER ACCESS</span><h2>{users.find((user) => String(user.id) === String(selectedUserId))?.name || "Account access"}</h2></div><button type="button" className="admin-icon-button" onClick={() => setUserAccessOpen(false)} aria-label="Close"><X size={18} /></button></div>
            <fieldset className="admin-assigned-role-fieldset">
              <legend>Assigned roles</legend>
              <p>Choose the access this account needs. You can assign more than one role.</p>
            <div className="admin-assigned-role-grid">
              {roles.map((role) => (
                <label className={`admin-assigned-role-card ${selectedUserRoles.includes(String(role.id)) ? "is-selected" : ""}`} key={role.id}>
                  <input
                    type="checkbox"
                    checked={selectedUserRoles.includes(String(role.id))}
                    onChange={() => toggle(selectedUserRoles, setSelectedUserRoles, role.id)}
                  />
                  <span className="admin-assigned-role-copy"><strong>{role.name}</strong><small>{role.description || "No description"}</small><small>{role.permissions?.length || 0} inherited permissions</small></span>
                  {role.name === "admin" && <em>Full access</em>}
                </label>
              ))}
            </div>
            </fieldset>
            <h3>Direct permission grants</h3>
            <PermissionModules
              permissions={permissions}
              selected={selectedUserPermissions}
              onToggle={(codes) => toggleMany(selectedUserPermissions, setSelectedUserPermissions, codes)}
            />
            <button className="admin-button admin-button-dark" disabled={saving}>{saving ? "Saving…" : "Save user access"}</button>
          </form></div>
        )}
      </section>

      <section className="admin-panel admin-settings-panel">
        <div className="admin-panel-heading">
          <div><h2>Create a role</h2><p>New roles start without permissions. Configure them above after creation.</p></div>
          <button type="button" className="admin-button admin-button-dark" disabled={saving} onClick={() => setCreateRoleOpen(true)}>Create role</button>
        </div>
      </section>
      {userPickerOpen && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setUserPickerOpen(false)}><section className="admin-modal admin-access-picker-modal">
        <div className="admin-modal-header"><div><span className="admin-eyebrow">USER ACCESS</span><h2>Choose an account</h2></div><button type="button" className="admin-icon-button" onClick={() => setUserPickerOpen(false)} aria-label="Close"><X size={18} /></button></div>
        <label className="admin-access-account-search"><Search size={16} /><input autoFocus type="search" value={userPickerSearch} onChange={(event) => setUserPickerSearch(event.target.value)} placeholder="Search name, phone, or email" /></label>
        <p className="admin-access-picker-hint">{userFilter ? `${filteredUsers.length} account(s) match your search.` : "Search accounts by name, phone, or email."}</p>
        <div className="admin-access-user-list">{filteredUsers.map((user) => <button type="button" key={user.id} onClick={async () => { if (await selectUser(user.id)) { setUserPickerOpen(false); setUserAccessOpen(true); } }}><span className="admin-access-user-initial">{(user.name || "U").slice(0, 1).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.phone}{user.email ? ` · ${user.email}` : ""}</small></span><small>{user.primaryRole || user.role || "customer"}</small></button>)}</div>
      </section></div>}
      {createRoleOpen && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setCreateRoleOpen(false)}><form className="admin-modal" onSubmit={async (event) => { if (await addRole(event)) setCreateRoleOpen(false); }}>
        <div className="admin-modal-header"><div><span className="admin-eyebrow">ACCESS CONTROL</span><h2>Create a role</h2></div><button type="button" className="admin-icon-button" onClick={() => setCreateRoleOpen(false)} aria-label="Close"><X size={18} /></button></div>
        <label>Role name<input value={roleName} onChange={(event) => setRoleName(event.target.value)} required minLength={2} maxLength={80} /></label><label>Description<input value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} maxLength={255} /></label>
        <div className="admin-modal-footer"><button type="button" className="admin-button admin-button-secondary" onClick={() => setCreateRoleOpen(false)}>Cancel</button><button className="admin-button admin-button-dark" disabled={saving}>{saving ? "Creating…" : "Create role"}</button></div>
      </form></div>}
    </div>
  );
}
