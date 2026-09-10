Plataforma de indicação de prestadores de serviço por proximidade.

Usuários
- Cliente/Contratante
- Prestador/Contratado
- Admin

## Identidade visual

- Linguagem de UI inspirada na Apple: fonte prioriza a stack do sistema (-apple-system/SF Pro, com Inter como fallback em quem não é Apple), sombras suaves e em camadas (baixa opacidade, bem difusas em vez de saturadas), cantos arredondados consistentes e transições com curva "spring" (cubic-bezier) e leve efeito de pressionar (scale) nos botões
- Tela de login/cadastro tem o painel lateral e o fundo em tom roxo escuro (gradiente flat, sem blobs), com o card do formulário claro por cima para manter o texto legível. Marca no painel lateral é um badge (ícone dentro de um quadrado arredondado branco) + o nome "NearHand" ao lado, maior que o resto do texto. Lista de benefícios sem cartão/fundo, só ícone + texto separados por linha fina (hairline). Campos de formulário e botão principal em formato pílula (totalmente arredondados)
- Modais do site (detalhe do serviço, criar/editar anúncio, criar/editar conta no admin) são dimensionados para desktop — bem mais largos que o padrão mobile-first, para não parecer app de celular dentro do navegador

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
- Botão único "Consultar" abre o chat com o prestador sobre aquele serviço — **não exige ter agendado nada antes**; cliente pode tirar dúvida com o prestador logo de cara
- Acesso à galeria estendida de fotos, se o prestador tiver adicionado além das do carrossel
- Seção de avaliações daquele anúncio específico (com comentários, não só nota), sem replicar avaliações de outros anúncios do mesmo prestador
- Calendário com as datas/horários em que aquele anúncio específico está disponível — calculado a partir do horário semanal fixo que o prestador definiu para aquele anúncio (ver Prestador, item 3), descontando datas que o prestador bloqueou
- Fluxo de contratação: botão "Solicitar serviço" abre uma **solicitação de orçamento/agendamento**, que o prestador aceita, recusa ou negocia pelo chat (status: solicitado → confirmado → em andamento → concluído, com cancelado a qualquer ponto antes de concluído). Se o cliente já tinha clicado em "Consultar" antes, o agendamento continua **na mesma conversa** — não cria um chat novo

## 6. Chat

- Aba própria "Chat" na navbar, com lista de todas as conversas do cliente e o painel da conversa selecionada
- **Agrupado por prestador**: se o cliente tem mais de uma conversa com o mesmo prestador (anúncios diferentes), elas ficam juntas sob um único cabeçalho com o nome dele, em vez de repetir o nome várias vezes na lista
- Quando o grupo tem mais de uma conversa, ele começa recolhido (só o cabeçalho com o nome e a contagem aparecem) com um botão para expandir/recolher e ver as conversas individuais — evita lista longa quando há muitos pedidos com a mesma pessoa. Grupo com só uma conversa aparece sempre expandido, sem botão. O grupo da conversa aberta no momento fica sempre expandido automaticamente
- Barra de busca no topo da lista de conversas, filtra por nome do prestador ou título do anúncio
- Logo abaixo da barra de busca, uma legenda fixa com bolinhas coloridas explicando o status de cada conversa (pendente, em andamento, concluído, cancelado) — a mesma bolinha colorida aparece ao lado de cada conversa na lista
- Filtro por status do pedido integrado à legenda: o cliente pode ativar ou desativar mais de um status ao mesmo tempo
- Botões de mensagem automática no chat: "Enviar endereço" e "Enviar telefone" — manda os dados já cadastrados no perfil sem precisar digitar
- Bolinha de notificação na aba Chat quando chega mensagem nova não lida, some ao abrir a conversa
- Também acessível pelo botão "Consultar" dentro da tela do serviço, abrindo direto na conversa daquele anúncio

## 7. Pós-contratação

- Histórico de serviços contratados
- Aba própria "Avaliações" na navbar: lista os serviços que o cliente já contratou (qualquer status exceto cancelado), com botão "Avaliar" habilitado apenas nos que já foram concluídos
- Favoritar um **anúncio específico** (não o prestador inteiro) — favoritar um serviço de um prestador não afeta os outros anúncios dele
- Favoritar também um **prestador** por inteiro, a partir da tela do anúncio ou do chat, sem alterar os favoritos de anúncios
- Tela de Favoritos com navbar interna nas seções "Anúncios favoritos" e "Prestadores favoritos"; a primeira agrupa os anúncios salvos por prestador e inclui o link "Ver todos os anúncios" (leva pra Explorar já filtrado por aquele prestador), enquanto a segunda lista os prestadores salvos, cada um com um botão "Ver anúncios" que **expande/recolhe a lista de anúncios daquele prestador ali mesmo na tela**, sem sair de Favoritos
- Notificações (prestador respondeu no chat, confirmou o serviço, etc.), com opção de marcar todas como lidas e limpar a caixa de entrada

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
  - Valor (fixo por serviço ou por hora), com opção de marcar como **negociável** — fica visível pro cliente ao lado do valor, tanto no card do catálogo quanto na tela expandida do serviço
  - Raio/área de atendimento a partir da localização cadastrada
- Editar anúncio existente (mesmo formulário de criação, pré-preenchido)
- Pausar anúncio temporariamente (sem excluir)
- Remover anúncio
- Seleção múltipla de anúncios (checkbox em cada um) com opção de remover todos os selecionados de uma vez
- Múltiplos anúncios/serviços por prestador (catálogo próprio dentro do perfil)

## 3. Agenda e disponibilidade

- **Horário semanal fixo por anúncio**: cada anúncio tem seu próprio padrão de dias da semana + horário de início/fim (ex: "Segunda e Quarta, 9h–12h" só para esse anúncio) — é a partir dele que o sistema calcula as próximas datas disponíveis pro cliente ver e agendar
- **Bloqueio de datas por cima do padrão semanal**: prestador pode bloquear uma data específica (folga, férias, feriado) — vale pra todos os anúncios dele, mesmo os que caíam dentro do horário semanal
- Definir tempo médio de duração por tipo de serviço (ajuda a evitar sobreposição de agenda)
- **Calendário do prestador**: mostra os dias/horários em que ele tem serviços marcados; permite desmarcar um serviço já agendado
- **Calendário do cliente**: mostra, na tela do serviço, as próximas datas em que aquele anúncio específico está disponível para agendamento

## 4. Gestão de solicitações e pedidos

- Receber solicitações de orçamento/agendamento enviadas pelo cliente
- Aceitar, recusar ou propor novo horário/valor para a solicitação
- Acompanhar status do pedido (solicitado → confirmado → em andamento → concluído)
- Cancelar um serviço já confirmado (com justificativa)
- Histórico de serviços prestados (concluídos e cancelados)
- Aba própria "Clientes atendidos" na navbar: lista cada cliente já atendido (nome, telefone e email, pra facilitar contato posterior). Se o mesmo cliente já contratou mais de um serviço, o nome aparece só 1 vez com a lista "Serviços prestados a essa pessoa:" abaixo, em vez de repetir o card por serviço
- **Ordem da navbar do prestador**: Painel, Agenda, Meus anúncios, Chat, Avaliações, Clientes atendidos

## 5. Chat com clientes

- Aba própria "Chat" na navbar, com lista de todas as conversas recebidas e o painel da conversa selecionada
- **Agrupado por cliente**: se o prestador tem mais de uma conversa com o mesmo cliente (serviços diferentes), elas ficam juntas sob um único cabeçalho com o nome dele, em vez de repetir o nome várias vezes na lista
- Quando o grupo tem mais de uma conversa, ele começa recolhido com um botão para expandir/recolher (mesmo comportamento do lado do cliente)
- Barra de busca no topo da lista de conversas, filtra por nome do cliente ou título do anúncio
- Legenda fixa abaixo da busca com bolinha colorida por status da conversa (pendente/em andamento/concluído/cancelado), mesma bolinha ao lado de cada item da lista
- Filtro por status do pedido integrado à legenda, permitindo selecionar mais de um status para exibição
- Botões de mensagem automática no chat: "Enviar endereço" e "Enviar telefone" — manda os dados já cadastrados no perfil sem precisar digitar
- Bolinha de notificação na aba Chat quando chega mensagem nova não lida, some ao abrir a conversa
- Conversar com o cliente antes, durante e depois da contratação
- Enviar orçamento/proposta de valor diretamente pelo chat

## 6. Avaliações e reputação

- Visualizar avaliações recebidas (nota e comentário)
- Responder publicamente às avaliações
- Acompanhar nota média e evolução da reputação ao longo do tempo
- Denunciar avaliação considerada abusiva ou falsa (encaminha para moderação do admin)

## 7. Financeiro e desempenho

- Extrato de pagamentos recebidos por serviço
- Métricas de desempenho: número de serviços realizados, taxa de aceitação, nota média geral do prestador (todas as avaliações recebidas) e faturamento no período
- Gráficos no painel inicial para os anúncios mais vendidos e os anúncios com melhor avaliação
- Histórico financeiro filtrável por período (mês, ano)

## 8. Notificações

- Nova solicitação de serviço recebida
- Nova mensagem no chat
- Nova avaliação recebida
- Lembrete de compromisso agendado
- Confirmação ou cancelamento de serviço pelo cliente
- Caixa de notificações com opção de marcar todas como lidas e limpar as mensagens

# Funcionalidades — Admin

## 1. Autenticação e navegação

- Login administrativo (email e senha), separado do login de cliente/prestador, com atalhos para as telas de login/cadastro de cliente e prestador
- Navbar em estilo tab group (pill/segmented) para alternar entre Início, Categorias, Anúncios, Contas e Avaliações, com aba ativa destacada; botão "Sair" ao lado da navbar
- **Página inicial (Início)**: banner de boas-vindas com o nome do admin, seguido de um grid 2x2 de cards clicáveis para Categorias, Anúncios, Contas e Avaliações, cada um mostrando uma contagem rápida (quantas categorias/anúncios/contas cadastradas, quantas avaliações denunciadas pendentes). É a página para onde o login redireciona

## 2. Gestão de categorias

- Ver todas as categorias cadastradas
- Buscar categoria por nome
- Criar, editar e remover categorias de serviço usadas em todo o site
- Seleção múltipla (checkbox por linha) com remoção em massa de categorias selecionadas
- Categorias também podem ser criadas por um prestador direto na hora de publicar um anúncio (ver Prestador, item 2)

## 3. Gestão de anúncios

- Ver todos os anúncios cadastrados na plataforma (de qualquer prestador), com busca por título ou nome do prestador
- Editar um anúncio (título, categoria, descrição, valor, tipo, negociável, raio, status) — admin **não** pode criar anúncio, só editar e apagar
- Apagar anúncio — a remoção funciona mesmo se o anúncio tiver pedidos/solicitações vinculados (remove em cascata mensagens, avaliações e solicitações ligadas ao anúncio antes de apagá-lo)
- Seleção múltipla (checkbox por linha) com remoção em massa de anúncios selecionados

## 4. Gestão de contas

- Ver todas as contas cadastradas (clientes e prestadores juntos), com busca por nome/email e filtro por tipo
- Criar conta nova (cliente ou prestador) direto pelo painel admin
- Editar dados de uma conta (nome, email, telefone, CPF/CNPJ quando prestador, endereço)
- Apagar conta
- Seleção múltipla (checkbox por linha) com remoção em massa de contas selecionadas

## 5. Moderação de avaliações

- Ver a fila de avaliações denunciadas por prestadores
- Aprovar a denúncia (avaliação volta a ficar visível) ou remover a avaliação definitivamente