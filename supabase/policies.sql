-- ============================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- Sistema Farmácia Couto
-- ============================================================

-- 1. Habilitar RLS em todas as tabelas
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_exames ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para a tabela `clientes`
-- Permitir leitura e escrita para todos os usuários autenticados
CREATE POLICY "Permitir leitura de clientes para usuários autenticados" 
  ON clientes FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Permitir inserção de clientes para usuários autenticados" 
  ON clientes FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de clientes para usuários autenticados" 
  ON clientes FOR UPDATE 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

-- 3. Políticas para a tabela `servicos`
CREATE POLICY "Permitir leitura de servicos para usuários autenticados" 
  ON servicos FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Permitir inserção de servicos para usuários autenticados" 
  ON servicos FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de servicos para usuários autenticados" 
  ON servicos FOR UPDATE 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

-- 4. Políticas para a tabela `system_users`
-- Apenas usuários autenticados podem ver o perfil de usuários do sistema
CREATE POLICY "Permitir leitura de usuarios para autenticados" 
  ON system_users FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Permitir modificacao de usuarios para autenticados" 
  ON system_users FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

-- 5. Políticas para a tabela `tipos_exames`
CREATE POLICY "Permitir leitura de tipos_exames para autenticados" 
  ON tipos_exames FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Permitir modificacao de tipos_exames para autenticados" 
  ON tipos_exames FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

-- 6. Políticas para a tabela `medicamentos`
ALTER TABLE medicamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de medicamentos para autenticados"
  ON medicamentos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Permitir modificacao de medicamentos para autenticados"
  ON medicamentos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
