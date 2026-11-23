'use strict';

const DB = GAME_DATA;
const coins = DB.coins;
const art = DB.art;
const IMAGES = {};
const HISTORY_KEY='ncg_v6_history';
const SESSION_KEY='ncg_v6_session';
const XRF_FEE=12;
const LABORATORY_FEE=15;
const GAME_VERSION='6.50';
const BACKUP_FORMAT='NCG_PARTIDA_V650';
const DAY_BOOK_KEY='ncg_v646_campaign_days';
const CAMPAIGN_LENGTH=30;
const SUPPORTED_SAVE_VERSIONS=new Set(['6.18','6.19','6.20','6.21','6.22','6.23','6.24','6.25','6.26','6.27','6.28','6.29','6.30','6.31','6.32','6.33','6.34','6.35','6.36','6.37','6.38','6.39','6.40','6.41','6.42','6.43','6.44','6.45','6.46','6.47','6.48','6.49','6.50']);
const REPUTATION_CAP=Number.POSITIVE_INFINITY;
const INSTITUTIONAL_TIERS=[{min:2200,title:'Consejo de museos',bonus:95},{min:1600,title:'Grandes colecciones públicas',bonus:80},{min:1200,title:'Patrimonio internacional',bonus:70},{min:900,title:'Fondos de alta especialización',bonus:60},{min:650,title:'Patrimonio de excepción',bonus:55},{min:500,title:'Museos y fondos públicos',bonus:40},{min:350,title:'Clientes institucionales',bonus:25}];
const OFFICE_FIXED_COST=95;
const WORKSHOP_ITEMS=[
 {id:'balance',title:'Balanza metrológica de 0,001 g',price:80,upkeep:2,desc:'Da tres decimales y un informe exclusivo de desviación frente a la tolerancia orientativa del tipo. Indicio, nunca prueba definitiva.'},
 {id:'micro',title:'Microscopio metalográfico de 5 aumentos',price:130,upkeep:4,desc:'Además del aumento ×5, aporta una lectura exclusiva de microestructura: colada, recubrimiento o superficie compatible, con posibles falsos positivos.'},
 {id:'xrf',title:'Calibración avanzada de XRF',price:400,upkeep:8,desc:'Mejora las lecturas de AMBAS caras: identifica más anomalías superficiales (no el núcleo). Precio 400 € y mantenimiento 8 €/jornada; tarifa ordinaria 12 € por cara.'}
];
const COIN_ACCESS_LEVEL={
 'france_20fr_1868':115,
 'byzantium_solidus_justinian':115,
 'austria_thaler_1780':165,
 '8_escudos_Carlos_IV_1806':225,
 'aureo_adriano':225,
 'guinea_jorge_i_1717':145,
 'soberano_jorge_v_1911':145,
 'vreneli_20fr_1899':115,
 'centimo_alfonso_xii_1878':165,
 'real_reyes_catolicos_1497':115,
 '8_reales_carlos_iv_mexico_1796':95,
 'trade_dollar_1873s':95,
 'athens_tetradrachm':95,
 'peso_caballito_1910':95
};
const ANCIENT_OR_HAMMERED=new Set(['denario_elephante_Cesar','8_reales_macuquina_Carlos_II','byzantium_solidus_justinian','athens_tetradrachm','aureo_adriano','denario_m_marcius_134ac','real_reyes_catolicos_1497']);
const ANCIENT_GRADE_NAMES=['F','Ch F','VF','Ch VF','XF','Ch XF','AU','Ch AU','MS','Ch MS','Gem MS'];
let STANDARD_GRADES_HTML='',STANDARD_FINISH_HTML='';
const MODERN_GRADE_BANDS={VF:[20,25,30,35],XF:[40,45],AU:[50,53,55,58],MS:[60,61,62,63,64,65,66,67,68,69,70]};
const CALIPER_MAX=42;
const CALIPER_MIN=5;
const CALIPER_STEP=.5;
const COIN_VISIBLE_RATIO=.927;
const TOOLS=[['view','✋','Vista'],['scale','⚖','Balanza'],['caliper','📏','Calibre'],['magnet','🧲','Imán'],['hydro','💧','Densidad'],['micro','🔎','Micro'],['uv','◉','UV'],['light','☀','Rasante'],['xrf','◈','XRF'],['edge','⊙','Canto'],['tap','♪','Toque'],['flip','↻','Girar']];
const HINTS={
 view:'Arrastra la moneda para moverla, pulsa F para girarla y utiliza la lupa (Micro) para examinar los detalles.',
 scale:'Arrastra la moneda hasta la balanza situada abajo a la derecha. Suéltala sobre el plato.',
 caliper:'El calibre se alinea automáticamente con la moneda. Pulsa Registrar para guardar el diámetro.',
 magnet:'Arrastra el imán rojo y plateado hasta el borde de la moneda. Sin atracción no significa que sea auténtica.',
 hydro:'Después de pesar en seco, arrastra la moneda al vaso de agua para medir su densidad.',
 micro:'Mueve el cursor sobre la moneda; la ventana ampliada permanece fija y muestra una zona mucho mayor en PC.',
 uv:'Mueve el haz UV sobre las caras de la moneda. Sirve para detectar algunos residuos, no la autenticidad por sí sola.',
 light:'Mueve la luz rasante para estudiar el relieve y posibles rayas o limpiezas.',
 xrf:'Haz clic sobre la moneda para obtener una lectura superficial de composición. El baño puede engañar al XRF.',
 edge:'Inspecciona el canto real del tipo de moneda: liso, estriado, cordoncillo, flores de lis o irregular a martillo. Gira con rueda o A/D.',
 tap:'Toca suavemente la moneda para oír su resonancia simulada. Pulsa sobre la moneda o Repetir sonido. Compara con el metal declarado; no demuestra autenticidad por sí sola.',
 flip:'Se ha girado la moneda.'
};
const DETAILS_RATE=0.05; // 5 % independiente por expediente.
const DETAIL_OPTIONS=['Cleaned','Scratched','Polished','Environmental damage','Bent','Edge damage','Chopmarked','Holed','Repaired','Graffiti','Corrosion','Altered surfaces'];

function historicalCaption(c){
 if(c?.historicalSpecReview)return 'Masa, diámetro y ley contrastados · dibujo de cuño sin cotejo completo';
 const arte=c?.referenciasArte;
 if(arte?.anverso && arte?.reverso)return 'Anverso y reverso con referencias de arte · cuño por verificar';
 if(arte?.anverso || arte?.reverso)return 'Grabado con referencia de arte · cuño por verificar';
 return c?.historicalSourceChecked===true
  ? 'Composición general cotejada · geometría de cuño estilizada'
  : 'Grabado vectorial del tipo · cuño por verificar';
}

