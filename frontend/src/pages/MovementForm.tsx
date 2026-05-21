import { Link, useSearchParams } from 'react-router-dom';
import { MovementForm as MovementFormComponent } from '../components/MovementForm';
import './MovementFormPage.css';

export function MovementFormPage() {
  const [searchParams] = useSearchParams();
  const initialProductId = searchParams.get('productId') ?? undefined;

  return (
    <main className="movementFormPage">
      <nav className="movementFormPageNav">
        <Link to="/">Volver al inventario</Link>
      </nav>
      <MovementFormComponent initialProductId={initialProductId} />
    </main>
  );
}
