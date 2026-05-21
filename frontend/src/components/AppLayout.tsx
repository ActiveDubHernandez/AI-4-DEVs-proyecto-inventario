import { Link, Outlet } from 'react-router-dom';
import './AppLayout.css';

export function AppLayout() {
  return (
    <div className="appLayout">
      <header className="appLayoutHeader">
        <nav className="appLayoutNav" aria-label="Navegación principal">
          <Link className="appLayoutBrand" to="/">
            Inventario
          </Link>
          <Link className="appLayoutAction" to="/movement">
            Registrar un Movimiento
          </Link>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
