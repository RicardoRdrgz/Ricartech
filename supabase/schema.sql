-- ============================================================
-- Ricartech — Supabase Schema
-- ============================================================
-- Ejecuta este archivo en el SQL Editor de tu proyecto Supabase.
-- Crea la tabla tickets, habilita RLS y configura permisos.
-- ============================================================

-- Tabla principal de tickets
CREATE TABLE IF NOT EXISTS public.tickets (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Estado del ticket
  estado TEXT DEFAULT 'Pendiente'
    CHECK (estado IN (
      'Pendiente',
      'En proceso',
      'Presupuesto enviado',
      'Aceptado',
      'Reparando',
      'Completado',
      'Cancelado'
    )),

  -- Datos del cliente
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT,
  cliente_email TEXT,
  cliente_direccion TEXT,
  cliente_localidad TEXT,
  cliente_cp TEXT,
  cliente_habitual TEXT DEFAULT 'no',

  -- Dispositivo
  dispositivo_tipo TEXT,
  dispositivo_marca TEXT,
  dispositivo_modelo TEXT,
  dispositivo_serie TEXT,
  dispositivo_so TEXT,
  dispositivo_anio TEXT,

  -- Avería
  averia_servicios TEXT[],
  averia_sintomas TEXT[],
  averia_descripcion TEXT,
  averia_fecha_inicio TEXT,
  averia_intentos TEXT,

  -- Logística
  logistica_urgencia TEXT,
  logistica_modalidad TEXT,
  logistica_disponibilidad TEXT[],
  logistica_backup TEXT,

  -- Extra
  extra_observaciones TEXT,

  -- Facturación
  importe_total NUMERIC(10,2),
  facturado BOOLEAN DEFAULT FALSE,
  fecha_factura TIMESTAMPTZ,
  numero_factura TEXT
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_tickets_estado ON public.tickets(estado);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON public.tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_cliente_email ON public.tickets(cliente_email);
CREATE INDEX IF NOT EXISTS idx_tickets_cliente_nombre ON public.tickets(cliente_nombre);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS (deniega todo por defecto)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- Políticas para ANON (formulario público de la web)
-- Solo puede INSERTar tickets nuevos
-- ----------------------------------------------------------
CREATE POLICY "anon_insert_tickets"
  ON public.tickets
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- ----------------------------------------------------------
-- Políticas para AUTHENTICATED (dashboard admin)
-- Puede todo: SELECT, INSERT, UPDATE, DELETE
-- Como solo existe 1 usuario (el admin), esto es seguro.
-- ----------------------------------------------------------
CREATE POLICY "auth_select_tickets"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "auth_insert_tickets"
  ON public.tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "auth_update_tickets"
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "auth_delete_tickets"
  ON public.tickets
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- TRIGGER: actualizar updated_at automáticamente
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- LISTO. Ahora crea tu usuario admin en:
-- Authentication → Users → Add user
-- Usa tu email real y una contraseña segura.
-- ============================================================
