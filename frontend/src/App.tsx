import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { MovementFormPage } from './pages/MovementForm';
import { ProductList } from './pages/ProductList';

function RedirectLegacyMovementRoute() {
  const location = useLocation();
  return <Navigate to={`/movement${location.search}`} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<ProductList />} />
          <Route path="/movement" element={<MovementFormPage />} />
          <Route path="/movements/new" element={<RedirectLegacyMovementRoute />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
