-- Seed du registre Master data (le planning, lui, démarre vide).
-- Une ligne par objet ; cle vide = clé pas encore définie (« to be defined » dans l'app).
-- À exécuter une seule fois, après 0003_planning_master_data.sql.

insert into public.master_data (type, cle, nom, ref, lien, tcode, resp, etat, remarque) values
-- Déjà créé
('Company code',     'C2NL',        'Philo television NL',            '1010', 'Eindhoven · NL · EUR · EN', 'EC01', 'Moad', 'cree', ''),
('Company code',     'C2BE',        'Philo Televisions BE',           '1010', 'BE · EUR · EN',             'EC01', 'Moad', 'cree', ''),
('Autre',            'YCOA',        'Chart of accounts',              '1010', 'C2NL, C2BE',                'OBY6', 'Moad', 'cree', 'Repris de 1010 par la copie'),
('Autre',            'K4',          'Fiscal year variant',            '1010', 'C2NL, C2BE',                'OBY6', 'Moad', 'cree', 'Repris de 1010'),
('Autre',            '1010',        'Posting period variant',         '1010', 'C2NL, C2BE',                'OBY6', 'Moad', 'cree', 'Partagée avec 1010 : vérifier OB52'),
('Controlling area', 'A000',        'Controlling area de 1010',       '',     'C2NL, C2BE',                'OX19', 'Moad', 'cree', ''),
('Number range',     '01, 02, 03…', 'Number ranges des documents FI', '1010', 'C2NL, C2BE',                'FBN1', 'Moad', 'cree', 'Year 9999'),
('Autre',            'TAXD',        'Tax procedure (logique DE)',     '',     'Pays NL et BE',             'OBBG', 'Moad', 'cree', 'Choix d''équipe ; tax codes à vérifier dans FTXP'),

-- Prévu : structure organisationnelle
('Plant',                '',     'Breda',                        '1010', 'C2NL',                         'EC02', '', 'prevu', ''),
('Plant',                '',     'Delft',                        '1010', 'C2NL',                         'EC02', '', 'prevu', ''),
('Plant',                '',     'Brussels',                     '1010', 'C2BE',                         'EC02', '', 'prevu', ''),
('Plant',                '',     'Antwerp',                      '1010', 'C2BE',                         'EC02', '', 'prevu', ''),
('Purchasing org',       'P2HQ', 'Achats centraux HQ Eindhoven', '',     'Sans company code · 4 plants', 'OX08', '', 'prevu', ''),
('Purchasing org',       'P2BR', 'Achats Breda',                 '',     'C2NL · Breda + Delft',         'OX08', '', 'prevu', ''),
('Purchasing org',       'P2BX', 'Achats Brussels',              '',     'C2BE · Brussels',              'OX08', '', 'prevu', ''),
('Purchasing org',       'P2AN', 'Achats Antwerp',               '',     'C2BE · Antwerp',               'OX08', '', 'prevu', ''),
('Sales org',            'S2NL', 'Sales NL',                     '',     'C2NL',                         'OVX5', '', 'prevu', ''),
('Sales org',            'S2BE', 'Sales BE',                     '',     'C2BE',                         'OVX5', '', 'prevu', ''),
('Distribution channel', '21',   'Consumer',                     '',     'S2NL, S2BE',                   'OVXI', '', 'prevu', ''),
('Distribution channel', '22',   'Industrial',                   '',     'S2NL, S2BE',                   'OVXI', '', 'prevu', ''),
('Distribution channel', '29',   'Intercompany',                 '',     'S2NL, S2BE',                   'OVXI', '', 'prevu', ''),
('Division',             '21',   'TV',                           '',     'S2NL, S2BE',                   'OVXB', '', 'prevu', ''),
('Division',             '22',   'Audio',                        '',     'S2NL, S2BE',                   'OVXB', '', 'prevu', ''),
('Shipping point',       'S2BR', 'Breda',                        '',     'Plant Breda',                  'OVXD', '', 'prevu', ''),
('Shipping point',       'S2BX', 'Brussels',                     '',     'Plant Brussels',               'OVXD', '', 'prevu', ''),

-- Prévu : matériaux (numérotation : 1… ROH, 2… HALB, 3… FERT, 4… VERP)
('Material', '', 'LED light',         '', 'ROH · PC · Breda + Brussels',         'MM01', '', 'prevu', 'N° 1… · contrat central HQ, LED Solutions, €10 / 1 000, MOQ 10 000'),
('Material', '', 'Power unit',        '', 'ROH · PC · Breda + Brussels',         'MM01', '', 'prevu', 'N° 1… · Battery United : Amsterdam pour Breda, Ghent pour Brussels, €25'),
('Material', '', 'TV remote',         '', 'ROH · PC · Breda (STO → Brussels)',   'MM01', '', 'prevu', 'N° 1… · scheduling agreement Philips, 500/mois, €5'),
('Material', '', 'TV standard',       '', 'ROH · PC · Breda + Brussels',         'MM01', '', 'prevu', 'N° 1… · TV standaard Utrecht, €20'),
('Material', '', 'Soundbar casing',   '', 'ROH · PC · Breda',                    'MM01', '', 'prevu', 'N° 1… · Soundbar Inc., €15 · BOX = 2 PC · PAL = 20 BOX = 40 PC · MOQ 10 BOX'),
('Material', '', 'LED screen 48"',    '', 'HALB · PC · Breda + Brussels',        'MM01', '', 'prevu', 'N° 2… · produit en interne'),
('Material', '', 'Speaker',           '', 'HALB · PC · Breda (STO → Brussels)',  'MM01', '', 'prevu', 'N° 2… · produit à Breda · prix interne €10 · pas de BOM'),
('Material', '', 'LED TV 48"',        '', 'FERT · PC · Breda + Brussels',        'MM01', '', 'prevu', 'N° 3… · min. 20 par société'),
('Material', '', 'Soundbar',          '', 'FERT · PC · Breda (STO → Brussels)',  'MM01', '', 'prevu', 'N° 3… · min. 20 par société · Soundbar Discount −10 %'),
('Material', '', 'TV box (vierge)',   '', 'VERP · PC · Breda + Brussels',        'MM01', '', 'prevu', 'N° 4… · Packing Solutions · PAL = 250 PC · €125 / PAL'),
('Material', '', 'TV box (imprimée)', '', 'VERP · PC · Breda + Brussels',        'MM01', '', 'prevu', 'N° 4… · sous-traitance The Print Shop, €4,50'),

-- Prévu : BOM
('BOM', '', 'BOM LED screen',                   '', 'Breda + Brussels', 'CS01', '', 'prevu', '2 500 LED light + 1 power unit'),
('BOM', '', 'BOM LED TV',                       '', 'Breda + Brussels', 'CS01', '', 'prevu', '1 LED screen + 1 remote + 1 TV standard + 2 speakers + 1 box imprimée'),
('BOM', '', 'BOM Soundbar',                     '', 'Breda',            'CS01', '', 'prevu', '1 casing + 4 speakers'),
('BOM', '', 'BOM Box imprimée (sous-traitance)', '', 'Breda + Brussels', 'CS01', '', 'prevu', '1 box vierge');
