// hash-guard DEBE importarse antes que cualquier otro módulo
// para capturar window.location.hash lo más temprano posible.
import './hash-guard';

import React, { useState } from 'react';
import { RouterProvider, createHashRouter } from 'react-router';
import { Toaster } from 'sonner';
import { routeDefinitions } from './routes';

// El router se crea de forma LAZY dentro de useState para garantizar que
// window.location.hash ya esté completamente disponible cuando se evalúa.
export default function App() {
  const [router] = useState(() => createHashRouter(routeDefinitions));

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors />
    </>
  );
}
