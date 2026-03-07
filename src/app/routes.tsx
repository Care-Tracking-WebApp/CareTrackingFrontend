import React from "react";
import { Navigate, useParams } from "react-router";
import { LoginPage } from "./pages/auth";
import { AdminDashboard, ServiceNew, ServiceDetail } from "./pages/admin";
import { CaregiverView } from "./pages/caregiver";
import { FamilyView } from "./pages/family";

function CaregiverPage() {
  const { token } = useParams<{ token: string }>();
  return <CaregiverView token={token!} />;
}

function FamilyPage() {
  const { token } = useParams<{ token: string }>();
  return <FamilyView token={token!} />;
}

export const routeDefinitions = [
  // Public routes (no auth)
  { path: "/shifts/:token",  Component: CaregiverPage },
  { path: "/patient/:token", Component: FamilyPage    },
  // Auth
  { path: "/login",          Component: LoginPage      },
  // Admin (auth guard in AdminLayout)
  { path: "/dashboard",      Component: AdminDashboard },
  { path: "/service/new",    Component: ServiceNew     },
  { path: "/service/:id",    Component: ServiceDetail  },
  // Root and catch-all → login
  { path: "/",  element: <Navigate to="/login" replace /> },
  { path: "*",  element: <Navigate to="/login" replace /> },
];
