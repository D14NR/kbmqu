import type { CategoryConfig } from "../../types/app";

type SidebarMenuProps = {
  categories: CategoryConfig[];
  activeKey: string;
  sidebarCollapsed: boolean;
  isMobile?: boolean;
  authSession?: { username: string; cabang?: string } | null;
  onToggle: () => void;
  onResize?: (width: number) => void;
  onCloseMobile?: () => void;
  onSelect: (key: string) => void;
};

export function SidebarMenu({
  categories,
  activeKey,
  sidebarCollapsed,
  isMobile = false,
  authSession,
  onToggle,
  onResize,
  onCloseMobile,
  onSelect,
}: SidebarMenuProps) {
  return (
    <aside className={`sidebar-kaiadmin ${sidebarCollapsed ? "is-collapsed" : ""}`}>
      <div className="sidebar-kaiadmin-inner">
        <div className="sidebar-brand-wrap">
          <div className="sidebar-brand-mark">
            <i className="bi bi-mortarboard" />
          </div>
          {!sidebarCollapsed && (
            <div className="sidebar-brand-text">
              <div className="sidebar-brand-title">KBM-Qu</div>
              {authSession?.username && (
                <div
                  className="sidebar-brand-subtitle mt-0.5"
                  title={`Login sebagai: ${authSession.username}${authSession.cabang ? ` (${authSession.cabang})` : ""}`}
                >
                  Login sebagai: <span className="fw-medium">{authSession.username}</span>
                  {authSession.cabang ? ` (${authSession.cabang})` : ""}
                </div>
              )}
            </div>
          )}
          {isMobile && onCloseMobile ? (
            <button
              type="button"
              className="btn btn-sm sidebar-kaiadmin-toggle"
              onClick={onCloseMobile}
              aria-label="Tutup menu"
            >
              <i className="bi bi-x-lg" />
            </button>
          ) : null}
        </div>

        {!sidebarCollapsed && <div className="sidebar-section-label">Main Menu</div>}

        {!isMobile ? (
          <div
            className="sidebar-resize-handle"
            onMouseDown={(event) => {
              event.preventDefault();
              const startX = event.clientX;
              const startWidth = event.currentTarget.closest('.sidebar-kaiadmin')?.clientWidth ?? 240;
              const handleMouseMove = (moveEvent: MouseEvent) => {
                const nextWidth = startWidth + (moveEvent.clientX - startX);
                onResize?.(nextWidth);
              };
              const handleMouseUp = () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
              };
              document.addEventListener("mousemove", handleMouseMove);
              document.addEventListener("mouseup", handleMouseUp);
            }}
          />
        ) : null}

        <div className="sidebar-nav-list">
          {categories.map((category) => (
            <button
              key={category.key}
              type="button"
              onClick={() => {
                onSelect(category.key);
                if (isMobile && onCloseMobile) {
                  onCloseMobile();
                }
              }}
              title={category.name}
              aria-label={category.name}
              className={`sidebar-nav-item ${sidebarCollapsed ? "justify-content-center" : "justify-content-start"} ${
                activeKey === category.key ? "active" : ""
              }`}
            >
              <span className="sidebar-nav-icon">
                <i className={`bi ${category.icon}`} />
              </span>
              <span className="sidebar-label">{category.name}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}