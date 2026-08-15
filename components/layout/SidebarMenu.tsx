import type { CategoryConfig } from "../../types/app";

type SidebarMenuProps = {
  categories: CategoryConfig[];
  activeKey: string;
  sidebarCollapsed: boolean;
  onToggle: () => void;
  onSelect: (key: string) => void;
};

export function SidebarMenu({
  categories,
  activeKey,
  sidebarCollapsed,
  onToggle,
  onSelect,
}: SidebarMenuProps) {
  return (
    <div className={`card shadow-sm sidebar-card ${sidebarCollapsed ? "is-collapsed" : ""}`}>
      <div className="card-body py-3 px-2">
        <div className="d-flex align-items-center justify-content-between mb-3 sidebar-header">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-grid fs-4 text-primary" />
            {!sidebarCollapsed && <span className="fw-semibold">Menu</span>}
          </div>
          <button
            type="button"
            className="btn btn-light btn-sm sidebar-toggle"
            onClick={onToggle}
            aria-label={sidebarCollapsed ? "Perlebar menu" : "Perkecil menu"}
          >
            <i className={`bi ${sidebarCollapsed ? "bi-chevron-right" : "bi-chevron-left"}`} />
          </button>
        </div>
        <div className="list-group list-group-flush">
          {categories.map((category) => (
            <button
              key={category.key}
              type="button"
              onClick={() => onSelect(category.key)}
              title={category.name}
              aria-label={category.name}
              className={`list-group-item list-group-item-action d-flex align-items-center gap-2 sidebar-icon-btn ${
                sidebarCollapsed ? "justify-content-center" : "justify-content-start"
              } ${activeKey === category.key ? "active" : ""}`}
            >
              <i className={`bi ${category.icon}`} />
              <span className="sidebar-label">{category.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}