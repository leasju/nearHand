Plataforma de indicação de prestadores de serviço por proximidade.

Usuários
- Cliente/Contratante
- Prestador/Contratado
- Admin

# Funcionalidades — Cliente

## 1. Autenticação e perfil + Configurações

- Login/cadastro de cliente (e-mail, senha, ou OAuth)
  - Cadastro
    - Nome completo*
    - Foto* (upload por arrastar/soltar ou selecionar arquivo — sem opção de colar link)
    - Endereço* (CEP, rua, número, complemento, bairro, cidade, estado)
    - Telefone
    - Email*
  - Login
    - Email ou Telefone
    - Senha
- Recuperação de senha
- Preferências de serviços **não** fazem parte do cadastro — são definidas só depois, em Configurações
- Cadastro deve capturar e salvar a **localização padrão** do cliente (endereço), geocodificada automaticamente para latitude/longitude — evita pedir geolocalização toda vez
- Edição de perfil
  - Nome completo*
  - Foto* (upload por arrastar/soltar ou selecionar arquivo — sem opção de colar link)
  - Endereço* (CEP, rua, número, complemento, bairro, cidade, estado — regeocodificado a cada alteração)
  - Telefone
  - Email*
- Configurações
  - Editar perfil
  - Editar método de pagamento
    - Cartão Crédito/Débito
    - Pix
  - Editar preferências de serviços

## 2. Busca e descoberta de serviços

- Barra de pesquisa (texto livre)
- Filtro por tipo de serviço
- Filtro por empresa/nome do prestador
- **Filtro principal por localização**
- Filtro por faixa de preço
- Filtro por avaliação mínima (ex: só prestadores com 4+ estrelas)
- Ordenação dos resultados (mais próximo, melhor avaliado, menor preço)
- Acesso à localização do cliente (geolocalização do navegador/app)

## 3. Mapa e proximidade

- Exibir mapa com serviços próximos (radar de proximidade por bairro/região/cidade)
- Mostrar serviços por proximidade
- Raio de busca configurável (ex: slider de 1km, 5km, 10km) — mesma engine usada no filtro de localização
- Alternância entre visualização em mapa e visualização em cards (catálogo)

## 4. Catálogo de serviços

- Serviços mostrados em formato de catálogo
- **Card do catálogo:**
  - Carrossel de imagens do serviço
  - Valor total do serviço ou valor cobrado por hora
  - Botão "Contratar serviço" → abre tela expandida
  - Nota média (estrelas) visível no card
  - Distância do cliente visível no card (ex: "2,3 km de você")

## 5. Tela expandida do serviço

- Informações aprofundadas do serviço e do prestador
- Chat com o prestador
- Acesso à galeria estendida de fotos, se o prestador tiver adicionado além das do carrossel
- Seção de avaliações de outros clientes (com comentários, não só nota)
- Calendário com os dias/horários de disponibilidade do prestador (calendário do cliente)
- Fluxo de contratação: botão "Solicitar serviço" abre uma **solicitação de orçamento/agendamento**, que o prestador aceita, recusa ou negocia pelo chat (status: solicitado → confirmado → em andamento → concluído, com cancelado a qualquer ponto antes de concluído)

## 6. Pós-contratação

- Histórico de serviços contratados
- Avaliar o prestador depois do serviço concluído
- Favoritar prestadores (lista de "meus preferidos")
- Notificações (prestador respondeu no chat, confirmou o serviço, etc.)

# Funcionalidades — Prestador de Serviço

## 1. Autenticação e perfil + Configurações

- Login/cadastro do prestador (e-mail, senha, ou OAuth)
  - Cadastro
    - Nome completo da empresa/do prestador*
    - Foto* (upload por arrastar/soltar ou selecionar arquivo — sem opção de colar link)
    - Endereço* (CEP, rua, número, complemento, bairro, cidade, estado)
    - Telefone
    - Email*
    - CPF ou CNPJ*
  - Login
    - Email ou CPF ou CNPJ
    - Senha
- Recuperação de senha
- Cadastro deve capturar e salvar a **localização padrão** do prestador (endereço), geocodificada automaticamente para latitude/longitude — evita pedir geolocalização toda vez, e é a base do raio de atendimento dos anúncios
- Edição de perfil
  - Nome completo da empresa/do prestador*
  - Foto* (upload por arrastar/soltar ou selecionar arquivo — sem opção de colar link)
  - Endereço* (CEP, rua, número, complemento, bairro, cidade, estado — regeocodificado a cada alteração)
  - Telefone
  - Email*
  - CPF ou CNPJ*
- Configurações
  - Editar perfil
  - Editar método de pagamento (recebimento)
    - Banco
    - Chave pix
    - Cartão Crédito/Débito
  - Editar anúncios de serviços
    - Adicionar
    - Alterar
    - Remover

## 2. Cadastro e gestão de anúncios de serviço

- Criar anúncio de serviço
  - Título do serviço
  - Categoria/tipo de serviço (escolhida entre as já cadastradas, ou o próprio prestador pode criar uma categoria nova na hora)
  - Descrição detalhada
  - Fotos do carrossel: até 10 fotos, sendo 2 obrigatórias para publicar o anúncio (upload por arrastar/soltar ou selecionar arquivo — sem opção de colar link)
  - Galeria estendida (opcional): prestador pode adicionar fotos extras além das do carrossel, agrupadas à parte; cliente acessa essa galeria só se quiser ver mais na tela expandida do serviço
  - Valor (fixo por serviço ou por hora)
  - Raio/área de atendimento a partir da localização cadastrada
- Editar anúncio existente (mesmo formulário de criação, pré-preenchido)
- Pausar anúncio temporariamente (sem excluir)
- Remover anúncio
- Múltiplos anúncios/serviços por prestador (catálogo próprio dentro do perfil)

## 3. Agenda e disponibilidade

- Definir horários disponíveis para atendimento
- Bloquear datas/horários indisponíveis (folga, férias, agenda cheia)
- Definir tempo médio de duração por tipo de serviço (ajuda a evitar sobreposição de agenda)
- **Calendário do prestador**: mostra os dias/horários em que ele tem serviços marcados; permite desmarcar um serviço já agendado
- **Calendário do cliente**: mostra, na tela do serviço, os dias em que aquele prestador está disponível para agendamento

## 4. Gestão de solicitações e pedidos

- Receber solicitações de orçamento/agendamento enviadas pelo cliente
- Aceitar, recusar ou propor novo horário/valor para a solicitação
- Acompanhar status do pedido (solicitado → confirmado → em andamento → concluído)
- Cancelar um serviço já confirmado (com justificativa)
- Histórico de serviços prestados (concluídos e cancelados)

## 5. Chat com clientes

- Conversar com o cliente antes, durante e depois da contratação
- Notificação de novas mensagens recebidas
- Enviar orçamento/proposta de valor diretamente pelo chat

## 6. Avaliações e reputação

- Visualizar avaliações recebidas (nota e comentário)
- Responder publicamente às avaliações
- Acompanhar nota média e evolução da reputação ao longo do tempo
- Denunciar avaliação considerada abusiva ou falsa (encaminha para moderação do admin)

## 7. Financeiro e desempenho

- Extrato de pagamentos recebidos por serviço
- Métricas de desempenho: número de serviços realizados, taxa de aceitação, nota média, faturamento no período
- Histórico financeiro filtrável por período (mês, ano)

## 8. Notificações

- Nova solicitação de serviço recebida
- Nova mensagem no chat
- Nova avaliação recebida
- Lembrete de compromisso agendado
- Confirmação ou cancelamento de serviço pelo cliente

# Funcionalidades — Admin

## 1. Autenticação

- Login administrativo (email e senha), separado do login de cliente/prestador

## 2. Gestão de categorias

- Criar, editar e remover categorias de serviço usadas em todo o site
- Categorias também podem ser criadas por um prestador direto na hora de publicar um anúncio (ver Prestador, item 2)

## 3. Moderação de avaliações

- Ver a fila de avaliações denunciadas por prestadores
- Aprovar a denúncia (avaliação volta a ficar visível) ou remover a avaliação definitivamente