-- ============================================
-- NearHand - Banco de dados
-- Plataforma de indicação de prestadores de serviço por proximidade
-- MySQL 8.x
-- ============================================

CREATE DATABASE IF NOT EXISTS nearhand CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE nearhand;

-- ============================================
-- ENDERECO
-- ============================================
CREATE TABLE endereco (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cep VARCHAR(9) NOT NULL,
    rua VARCHAR(200) NOT NULL,
    numero VARCHAR(10) NOT NULL,
    complemento VARCHAR(100),
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado CHAR(2) NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL
);

-- ============================================
-- CATEGORIA
-- ============================================
CREATE TABLE categoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE
);

-- ============================================
-- ADMIN
-- ============================================
CREATE TABLE admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL
);

-- ============================================
-- CLIENTE
-- ============================================
CREATE TABLE cliente (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_completo VARCHAR(150) NOT NULL,
    foto TEXT, -- URL ou imagem em base64 (upload local, redimensionada no navegador)
    endereco_id INT NOT NULL,
    telefone VARCHAR(11),
    email VARCHAR(200) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    preferencias VARCHAR(255), -- nomes de categoria separados por vírgula, ex: "Eletricista,Limpeza"
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (endereco_id) REFERENCES endereco(id)
);

-- ============================================
-- PRESTADOR
-- ============================================
CREATE TABLE prestador (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_empresa VARCHAR(150) NOT NULL,
    foto TEXT, -- URL ou imagem em base64 (upload local, redimensionada no navegador)
    endereco_id INT NOT NULL,
    telefone VARCHAR(11),
    email VARCHAR(200) NOT NULL UNIQUE,
    cpf_cnpj VARCHAR(18) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (endereco_id) REFERENCES endereco(id)
);

-- ============================================
-- SERVICO (anúncio do prestador)
-- ============================================
CREATE TABLE servico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prestador_id INT NOT NULL,
    categoria_id INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT,
    valor DECIMAL(10, 2) NOT NULL,
    tipo_valor VARCHAR(10) NOT NULL CHECK (tipo_valor IN ('fixo', 'por_hora')),
    raio_atendimento_km INT NOT NULL DEFAULT 5,
    status VARCHAR(15) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'removido')),
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prestador_id) REFERENCES prestador(id),
    FOREIGN KEY (categoria_id) REFERENCES categoria(id)
);

-- ============================================
-- FOTO_SERVICO
-- ============================================
CREATE TABLE foto_servico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    servico_id INT NOT NULL,
    url TEXT NOT NULL, -- URL ou imagem em base64 (upload local, redimensionada no navegador)
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('carrossel', 'galeria')),
    ordem INT NOT NULL DEFAULT 0,
    FOREIGN KEY (servico_id) REFERENCES servico(id) ON DELETE CASCADE
);

-- ============================================
-- DISPONIBILIDADE (calendário do prestador)
-- ============================================
CREATE TABLE disponibilidade (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prestador_id INT NOT NULL,
    data DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    bloqueado BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (prestador_id) REFERENCES prestador(id)
);

-- ============================================
-- SOLICITACAO (pedido de orçamento/agendamento)
-- ============================================
CREATE TABLE solicitacao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    servico_id INT NOT NULL,
    data_hora_agendada DATETIME,
    valor_proposto DECIMAL(10, 2),
    status VARCHAR(15) NOT NULL DEFAULT 'solicitado'
        CHECK (status IN ('solicitado', 'confirmado', 'em_andamento', 'concluido', 'cancelado')),
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES cliente(id),
    FOREIGN KEY (servico_id) REFERENCES servico(id)
);

-- ============================================
-- AVALIACAO
-- ============================================
CREATE TABLE avaliacao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    solicitacao_id INT NOT NULL UNIQUE,
    nota INT NOT NULL CHECK (nota BETWEEN 1 AND 5),
    comentario TEXT,
    resposta_prestador TEXT,
    denunciada BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (solicitacao_id) REFERENCES solicitacao(id)
);

-- ============================================
-- MENSAGEM (chat vinculado à solicitação)
-- ============================================
CREATE TABLE mensagem (
    id INT AUTO_INCREMENT PRIMARY KEY,
    solicitacao_id INT NOT NULL,
    remetente_id INT NOT NULL,
    remetente_tipo VARCHAR(10) NOT NULL CHECK (remetente_tipo IN ('cliente', 'prestador')),
    texto TEXT NOT NULL,
    data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (solicitacao_id) REFERENCES solicitacao(id)
);

-- ============================================
-- FAVORITO
-- ============================================
CREATE TABLE favorito (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    prestador_id INT NOT NULL,
    FOREIGN KEY (cliente_id) REFERENCES cliente(id),
    FOREIGN KEY (prestador_id) REFERENCES prestador(id),
    UNIQUE (cliente_id, prestador_id)
);

-- ============================================
-- METODO_PAGAMENTO (cliente)
-- ============================================
CREATE TABLE metodo_pagamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('cartao_credito', 'cartao_debito', 'pix')),
    chave_pix VARCHAR(140),
    ultimos_4_digitos CHAR(4),
    FOREIGN KEY (cliente_id) REFERENCES cliente(id)
);

-- ============================================
-- METODO_RECEBIMENTO (prestador)
-- ============================================
CREATE TABLE metodo_recebimento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prestador_id INT NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('banco', 'pix', 'cartao')),
    chave_pix VARCHAR(140),
    ultimos_4_digitos CHAR(4),
    banco VARCHAR(100),
    agencia VARCHAR(20),
    conta VARCHAR(30),
    FOREIGN KEY (prestador_id) REFERENCES prestador(id)
);

-- ============================================
-- NOTIFICACAO
-- ============================================
CREATE TABLE notificacao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    usuario_tipo VARCHAR(10) NOT NULL CHECK (usuario_tipo IN ('cliente', 'prestador')),
    tipo VARCHAR(40) NOT NULL,
    mensagem VARCHAR(255) NOT NULL,
    lida BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notificacao_usuario (usuario_id, usuario_tipo, lida, criado_em)
);