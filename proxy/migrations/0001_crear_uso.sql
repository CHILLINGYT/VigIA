-- Contador de uso por día, para limitar cuántas consultas hace cada instalación.
CREATE TABLE uso (
  id TEXT NOT NULL,          -- ID de instalación (UUID), o 'global' para el total
  dia TEXT NOT NULL,         -- AAAA-MM-DD en hora UTC
  tipo TEXT NOT NULL,        -- 'consulta' (más adelante también 'chat')
  cantidad INTEGER NOT NULL,
  PRIMARY KEY (id, dia, tipo)
);
