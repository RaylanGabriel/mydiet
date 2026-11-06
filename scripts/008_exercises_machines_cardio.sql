-- 1) Ritmo do cardio (esteira: velocidade e inclinação; escada/bike/elíptico: nível)
--    workout_exercises guarda o ALVO; session_sets guarda o que foi FEITO.
ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS velocidade_kmh NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS inclinacao_pct NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS nivel NUMERIC(4,1);

ALTER TABLE public.session_sets
  ADD COLUMN IF NOT EXISTS duracao_min NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS velocidade_kmh NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS inclinacao_pct NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS nivel NUMERIC(4,1);

-- 2) Novos exercícios na biblioteca global: máquinas, improvisos na polia e cardio.
--    Não duplica: ignora o exercício se já existir um com o mesmo nome (sem acento/maiúscula)
--    ou que combine com o padrão da coluna "parecido" (ex.: qualquer cardio com "escada").
WITH novos(nome, grupo, equipamento, instrucoes, parecido) AS (
  VALUES
  -- PEITO
  ('Voador (peck deck)', 'Peito', 'Máquina', 'Costas apoiadas e cotovelos levemente flexionados. Feche os braços à frente do peito contraindo o peitoral e volte devagar até sentir alongar.', '%peck deck%'),
  ('Supino inclinado na máquina', 'Peito', 'Máquina', 'Ajuste o banco para as pegadas ficarem na linha do peito. Empurre sem travar os cotovelos e volte controlando.', NULL),
  ('Supino no smith', 'Peito', 'Smith', 'Banco reto sob a barra, que deve descer até a linha do mamilo. A trava do smith dá segurança para treinar sem ajudante.', NULL),
  ('Supino inclinado no smith', 'Peito', 'Smith', 'Banco a 30-45°. A barra desce até a parte de cima do peito. Bom para a porção superior do peitoral.', NULL),
  ('Crucifixo na polia (substitui voador)', 'Peito', 'Polia', 'IMPROVISO sem voador: polias na altura do peito, dê um passo à frente e feche os braços em arco, como num abraço, sem dobrar mais os cotovelos.', NULL),
  ('Crossover polia baixa', 'Peito', 'Polia', 'Polias embaixo. Leve as mãos de baixo para cima até a altura do queixo. Enfatiza a parte superior do peitoral.', NULL),
  ('Paralelas (mergulho)', 'Peito', 'Peso corporal', 'Incline o tronco à frente para focar no peito. Desça até os ombros ficarem na linha dos cotovelos e suba.', '%paralela%'),

  -- COSTAS
  ('Puxada articulada', 'Costas', 'Máquina', 'Peito apoiado ou coxas travadas. Puxe as pegadas levando os cotovelos para baixo e para trás, sem balançar o tronco.', NULL),
  ('Remada articulada (máquina)', 'Costas', 'Máquina', 'Peito no apoio. Puxe as pegadas até a linha do abdômen, juntando as escápulas no final.', NULL),
  ('Remada cavalinho', 'Costas', 'Barra T', 'Tronco inclinado a ~45°, coluna neutra. Puxe a barra em direção ao abdômen e desça controlando.', '%cavalinho%'),
  ('Barra fixa assistida (graviton)', 'Costas', 'Máquina', 'Joelhos na plataforma, que tira parte do peso. Quanto MAIS peso no aparelho, mais fácil. Ótima para evoluir até a barra fixa.', '%graviton%'),
  ('Puxada na polia ajoelhado (substitui puxada)', 'Costas', 'Polia', 'IMPROVISO sem máquina de puxada: use a polia alta do crossover com barra ou triângulo, ajoelhado, e puxe até a parte de cima do peito.', NULL),
  ('Pulldown na polia (braços estendidos)', 'Costas', 'Polia', 'Polia alta, braços quase retos. Leve a barra ou a corda até as coxas usando as costas, sem dobrar os cotovelos.', '%pulldown%'),
  ('Remada unilateral na polia', 'Costas', 'Polia', 'Polia baixa ou média, um braço por vez. Puxe o cotovelo para trás junto ao corpo e alongue bem na volta.', NULL),
  ('Pullover na polia', 'Costas', 'Polia', 'De frente para a polia alta, tronco levemente inclinado. Desça a barra em arco até as coxas com os braços quase estendidos.', NULL),
  ('Hiperextensão lombar (banco romano)', 'Costas', 'Banco', 'Quadril na borda do apoio. Desça o tronco com a coluna neutra e suba até alinhar com as pernas, sem hiperestender.', '%banco romano%'),
  ('Encolhimento com halteres', 'Costas', 'Halteres', 'Braços estendidos ao lado do corpo. Eleve os ombros em direção às orelhas, segure 1 s e desça. Trabalha o trapézio.', '%encolhimento%'),

  -- OMBROS
  ('Elevação lateral na máquina', 'Ombros', 'Máquina', 'Cotovelos nos apoios. Eleve os braços até a linha dos ombros e desça devagar.', NULL),
  ('Elevação lateral na polia', 'Ombros', 'Polia', 'Polia baixa, cabo passando pela frente do corpo. Eleve o braço até a linha do ombro. Mantém tensão no músculo o movimento todo.', NULL),
  ('Voador inverso (máquina)', 'Ombros', 'Máquina', 'De frente para o encosto, abra os braços para trás na altura dos ombros. Trabalha o deltoide posterior.', '%voador inverso%'),
  ('Crucifixo inverso na polia (substitui voador inverso)', 'Ombros', 'Polia', 'IMPROVISO sem voador inverso: polias na altura dos ombros, cabos cruzados. Abra os braços para trás com os cotovelos levemente flexionados.', NULL),
  ('Face pull na polia', 'Ombros', 'Polia', 'Corda na polia alta. Puxe em direção ao rosto abrindo as mãos e girando os ombros para fora. Ótimo para postura e ombro posterior.', '%face pull%'),
  ('Desenvolvimento no smith', 'Ombros', 'Smith', 'Sentado, banco a ~80°. A barra desce até a altura do queixo e sobe sem travar os cotovelos.', NULL),
  ('Elevação frontal na polia', 'Ombros', 'Polia', 'De costas para a polia baixa, cabo entre as pernas. Eleve o braço à frente até a linha dos ombros.', NULL),

  -- BÍCEPS
  ('Rosca Scott na máquina', 'Bíceps', 'Máquina', 'Braços apoiados no banco inclinado. Suba sem tirar os cotovelos do apoio e desça até quase estender.', NULL),
  ('Rosca na polia baixa', 'Bíceps', 'Polia', 'Barra reta ou W na polia baixa. Cotovelos colados ao corpo. A polia mantém a tensão até no topo do movimento.', NULL),
  ('Rosca martelo na corda (polia)', 'Bíceps', 'Polia', 'Corda na polia baixa, palmas viradas uma para a outra. Suba sem mexer os cotovelos. Trabalha bíceps e antebraço.', NULL),
  ('Rosca Scott na polia (substitui máquina Scott)', 'Bíceps', 'Polia', 'IMPROVISO sem máquina Scott: coloque o banco Scott de frente para a polia baixa e faça a rosca com a barra do cabo.', NULL),

  -- TRÍCEPS
  ('Tríceps corda', 'Tríceps', 'Polia', 'Corda na polia alta, cotovelos fixos ao lado do corpo. Estenda os braços e abra a corda no final.', NULL),
  ('Tríceps testa na polia', 'Tríceps', 'Polia', 'Deitado no banco de frente para a polia baixa ou de costas para a alta. Estenda os cotovelos mantendo os braços parados.', NULL),
  ('Tríceps unilateral na polia', 'Tríceps', 'Polia', 'Um braço por vez, pegada invertida ou com a manopla. Bom para corrigir diferença de força entre os lados.', NULL),
  ('Tríceps na máquina (paralela sentado)', 'Tríceps', 'Máquina', 'Sentado, empurre as pegadas para baixo até estender os braços, com os cotovelos junto ao corpo.', NULL),
  ('Mergulho assistido na máquina', 'Tríceps', 'Máquina', 'Joelhos na plataforma, tronco reto para focar no tríceps. Quanto mais peso no aparelho, mais fácil.', NULL),

  -- PERNAS
  ('Hack squat (máquina)', 'Pernas', 'Máquina', 'Costas apoiadas, pés na largura dos ombros. Desça até as coxas ficarem paralelas à plataforma e empurre pelo meio do pé.', '%hack%'),
  ('Leg press horizontal', 'Pernas', 'Máquina', 'Sentado, pés no meio da plataforma. Dobre até ~90° nos joelhos sem tirar o quadril do banco.', NULL),
  ('Agachamento no smith', 'Pernas', 'Smith', 'Pés um pouco à frente da barra. A trilha guiada ajuda quem está aprendendo a agachar ou treina sem ajudante.', NULL),
  ('Cadeira flexora (sentado)', 'Pernas', 'Máquina', 'Sentado, trave as coxas no apoio. Dobre os joelhos levando os calcanhares para baixo do banco.', '%flexora sentad%'),
  ('Cadeira adutora', 'Pernas', 'Máquina', 'Sentado, feche as pernas contra os apoios e volte devagar. Trabalha a parte interna da coxa.', '%adutora%'),
  ('Extensora na polia (substitui cadeira extensora)', 'Pernas', 'Polia', 'IMPROVISO sem cadeira extensora: tornozeleira presa na polia baixa, sente num banco alto de costas para a polia e estenda o joelho até a perna ficar reta.', NULL),
  ('Flexora em pé na polia (substitui mesa flexora)', 'Pernas', 'Polia', 'IMPROVISO sem mesa flexora: tornozeleira presa na polia baixa, de frente para a máquina e apoiado nela. Dobre o joelho levando o calcanhar ao glúteo.', NULL),
  ('Adução na polia (substitui cadeira adutora)', 'Pernas', 'Polia', 'IMPROVISO sem adutora: tornozeleira na polia baixa, de lado para a máquina. Puxe a perna de fora para dentro, cruzando à frente da outra.', NULL),
  ('Agachamento na polia baixa (substitui leg press)', 'Pernas', 'Polia', 'IMPROVISO quando o leg press está ocupado: segure a barra ou a corda da polia baixa junto ao peito e agache, com o cabo dando a carga.', NULL),
  ('Agachamento búlgaro', 'Pernas', 'Halteres', 'Pé de trás apoiado num banco. Desça o joelho de trás em direção ao chão com o tronco firme. Excelente para coxa e glúteo.', '%bulgaro%'),
  ('Afundo no smith', 'Pernas', 'Smith', 'Um pé à frente e outro atrás, sob a barra. Desça reto até os dois joelhos ficarem a ~90°.', NULL),
  ('Stiff com halteres', 'Pernas', 'Halteres', 'Joelhos levemente flexionados. Desça os halteres rente às pernas jogando o quadril para trás, com a coluna neutra.', NULL),

  -- GLÚTEOS
  ('Glúteo na máquina (coice)', 'Glúteos', 'Máquina', 'Apoie o peito e empurre a plataforma para trás e para cima com o calcanhar, contraindo o glúteo no final.', NULL),
  ('Coice na polia (substitui máquina de glúteo)', 'Glúteos', 'Polia', 'IMPROVISO sem máquina de glúteo: tornozeleira na polia baixa, de frente para a máquina. Leve a perna para trás com o joelho levemente dobrado.', NULL),
  ('Abdução na polia (substitui cadeira abdutora)', 'Glúteos', 'Polia', 'IMPROVISO sem abdutora: tornozeleira na polia baixa, de lado para a máquina. Afaste a perna de fora para o lado sem inclinar o tronco.', NULL),
  ('Elevação pélvica na máquina', 'Glúteos', 'Máquina', 'Costas no apoio e cinto sobre o quadril. Suba o quadril até alinhar com o tronco e segure 1 s no topo.', NULL),
  ('Elevação pélvica no smith', 'Glúteos', 'Smith', 'Costas apoiadas num banco, barra do smith sobre o quadril (use uma proteção). A trilha guiada facilita usar cargas altas.', NULL),
  ('Pull-through na polia', 'Glúteos', 'Polia', 'De costas para a polia baixa, corda entre as pernas. Jogue o quadril para trás e estenda contraindo o glúteo. Alternativa ao stiff e à elevação pélvica.', '%pull%through%'),

  -- PANTURRILHA
  ('Panturrilha no leg press', 'Panturrilha', 'Máquina', 'Só a ponta dos pés na borda da plataforma, joelhos estendidos. Empurre com a ponta dos pés e alongue bem na descida.', NULL),
  ('Panturrilha no smith', 'Panturrilha', 'Smith', 'Ponta dos pés sobre um step embaixo da barra. Suba o máximo possível e desça alongando.', NULL),
  ('Panturrilha unilateral com halter (substitui máquina)', 'Panturrilha', 'Halteres', 'IMPROVISO sem máquina: um pé num degrau, halter na mão do mesmo lado e a outra mão apoiada. Suba e desça com amplitude total.', NULL),

  -- ABDÔMEN
  ('Abdominal na máquina', 'Abdômen', 'Máquina', 'Sentado, flexione o tronco trazendo o peito em direção às coxas. Expire na subida.', NULL),
  ('Abdominal na polia (ajoelhado)', 'Abdômen', 'Polia', 'Ajoelhado de frente para a polia alta, corda atrás da cabeça. Enrole o tronco levando os cotovelos em direção às coxas.', NULL),
  ('Elevação de pernas na paralela', 'Abdômen', 'Peso corporal', 'Antebraços apoiados na paralela. Suba os joelhos (ou as pernas retas) até a altura do quadril sem balançar.', NULL),
  ('Abdominal infra', 'Abdômen', 'Peso corporal', 'Deitado, mãos ao lado do corpo. Suba as pernas tirando o quadril do chão no final e desça devagar.', '%infra%'),
  ('Pallof press (antirrotação na polia)', 'Abdômen', 'Polia', 'De lado para a polia na altura do peito. Empurre o puxador à frente e resista à rotação do tronco. Fortalece o core sem flexionar a coluna.', '%pallof%'),

  -- CARDIO
  ('Escada (simulador)', 'Cardio', 'Máquina', 'Tronco ereto, sem se apoiar com força no corrimão. Anote o nível e o tempo para acompanhar a evolução.', '%escada%'),
  ('Bicicleta horizontal', 'Cardio', 'Máquina', 'Encosto apoiado, menor impacto na lombar. Boa opção para quem tem dor nas costas ou nos joelhos.', NULL),
  ('Spinning (bike indoor)', 'Cardio', 'Máquina', 'Ajuste o banco na altura do quadril. Alterne trechos de mais carga (subida) e mais rotação.', '%spinning%'),
  ('Air bike', 'Cardio', 'Máquina', 'Pernas e braços juntos. Quanto mais forte você pedala, maior a resistência. Ótima para intervalados.', NULL),
  ('Caminhada ao ar livre', 'Cardio', 'Ao ar livre', 'Ritmo em que dá para conversar com algum esforço. Anote o tempo e, se tiver relógio ou app, a velocidade média.', NULL),
  ('Corrida ao ar livre', 'Cardio', 'Ao ar livre', 'Comece leve e aumente aos poucos. Anote o tempo e a velocidade média (ou o pace).', NULL)
)
INSERT INTO public.exercises (user_id, nome, grupo_muscular, equipamento, instrucoes)
SELECT NULL, n.nome, n.grupo, n.equipamento, n.instrucoes
FROM novos n
WHERE NOT EXISTS (
  SELECT 1 FROM public.exercises e
  WHERE e.user_id IS NULL
    AND (
      translate(lower(e.nome), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
        = translate(lower(n.nome), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
      OR (
        n.parecido IS NOT NULL
        AND translate(lower(e.nome), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') LIKE n.parecido
        AND e.grupo_muscular = n.grupo
      )
    )
);
