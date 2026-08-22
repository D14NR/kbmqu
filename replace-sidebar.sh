#!/bin/bash
cat src/index.css | head -n 716 > src/index_new.css
cat << 'CSS' >> src/index_new.css
.sidebar-kaiadmin {
  min-height: calc(100vh - 2rem);
  border-radius: 20px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  background: #ffffff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  position: sticky;
  top: 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-kaiadmin-inner {
  padding: 1rem 0.75rem;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
}

.sidebar-brand-wrap {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.5rem 0.5rem 1.5rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px dashed rgba(203, 213, 225, 0.6);
}

.sidebar-brand-mark {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  border-radius: 10px;
  background: #0f172a;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  transition: transform 0.25s ease;
}

.sidebar-brand-mark:hover {
  transform: rotate(-5deg) scale(1.05);
}

.sidebar-brand-mark i {
  line-height: 1;
}

.sidebar-brand-title {
  font-weight: 700;
  line-height: 1.2;
  font-size: 1.05rem;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.5px;
}

.sidebar-brand-subtitle {
  margin-top: 0.1rem;
  font-size: 0.68rem;
  color: #64748b;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-kaiadmin-toggle {
  margin-left: auto;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  color: #64748b;
  background: #f8fafc;
  padding: 0;
  transition: all 0.2s ease;
}

.sidebar-kaiadmin-toggle:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.sidebar-resize-handle {
  position: absolute;
  top: 0;
  right: -8px;
  width: 16px;
  height: 100%;
  cursor: ew-resize;
  z-index: 10;
}

.sidebar-resize-handle::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 40px;
  border-radius: 999px;
  background: rgba(203, 213, 225, 0.6);
}

.sidebar-section-label {
  padding: 0.75rem 0.75rem 0.5rem;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #94a3b8;
}

.sidebar-nav-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow-x: hidden;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  color: #64748b;
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  text-align: left;
  transition: all 0.15s ease-in-out;
  position: relative;
  font-weight: 500;
  font-size: 0.875rem;
}

.sidebar-nav-item:hover {
  background: #f8fafc;
  color: #0f172a;
}

.sidebar-nav-item.active {
  background: #f1f5f9;
  color: #0f172a;
  font-weight: 600;
}

.sidebar-nav-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 28px;
  color: #94a3b8;
  transition: color 0.15s ease;
}

.sidebar-nav-icon i {
  font-size: 1.05rem;
}

.sidebar-nav-item:hover .sidebar-nav-icon {
  color: #0f172a;
}

.sidebar-nav-item.active .sidebar-nav-icon {
  color: #0f172a;
}
CSS
cat src/index.css | tail -n +897 >> src/index_new.css
mv src/index_new.css src/index.css
