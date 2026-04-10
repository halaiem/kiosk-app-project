import { useState, useMemo, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Driver } from '@/types/kiosk';

const MOTIVATIONAL_PHRASES = [
  'Каждый ваш рейс — это сотни людей, которые добрались вовремя. Вы важны!',
  'Город не спит благодаря вам. Завтра маршрут снова ждёт своего лучшего водителя!',
  'Профессионал за рулём — это вы. Отдыхайте и возвращайтесь с новыми силами!',
  'Вы — надёжное звено городского транспорта. До завтра, капитан маршрута!',
  'Отличная работа на линии! Пассажиры ценят ваш труд, даже если не говорят об этом.',
  'Безопасность и точность — ваш почерк. Отдохните, завтра новый день и новые рейсы!',
  'Настоящий профессионал не просто водит — он дарит людям уверенность. Спасибо вам!',
  'За рулём — мастер своего дела. Восстанавливайте силы, маршрут без вас не тот!',
  'Ваша смена завершена, но ваш вклад остаётся. Город благодарен — до встречи!',
  'Дорога покоряется тем, кто любит своё дело. Вы — один из лучших. До завтра!',
  'Каждая остановка, каждый поворот — с вниманием и заботой. Так держать!',
  'Смена закрыта. Пассажиры доехали. Город живёт. Это ваша работа.',
  'Вы несёте ответственность за людей в салоне. И справляетесь с ней каждый день.',
  'Усталость — это признак хорошо сделанной работы. Отдыхайте, водитель!',
  'Маршрут выполнен. Вы молодец. До завтра!',
  'За рулём нет мелочей — вы это знаете. Поэтому вы профессионал.',
  'Тысячи людей доверяют вам свою безопасность. Вы это доверие оправдываете.',
  'Сложная смена? Вы справились. Лёгкая? Вы не расслаблялись. Оба варианта — про вас.',
  'Водитель — это не профессия, это призвание. Ваше призвание видно в работе.',
  'Сегодня под вашим управлением всё шло как часы. Прекрасная смена!',
  'Пунктуальность, вежливость, безопасность — ваши три принципа. Все соблюдены.',
  'Каждая поездка без происшествий — ваша личная победа.',
  'Руль в надёжных руках — это вы. Пассажиры это чувствуют.',
  'Водитель общественного транспорта — незаменимая часть города. Вы — эта часть.',
  'Сегодня вы дарили людям время. Помогали им добраться туда, куда нужно.',
  'Хорошая смена — это когда пассажиры выходят довольными. Сегодня — так.',
  'Ваши реакции на дороге — это годы опыта. Этот опыт спасает жизни.',
  'Смена завершена. Вы сделали своё дело честно. Это дорогого стоит.',
  'Дорога была долгой. Но вы прошли её с достоинством.',
  'Каждый рейс начинается и заканчивается вашей ответственностью. Вы её несёте.',
  'Не каждый может работать с людьми весь день. Вы можете. И делаете это хорошо.',
  'Терпение водителя — это дар для пассажиров. Вы его щедро отдаёте.',
  'Сегодня вы были голосом и лицом городского транспорта. Лицо достойное.',
  'Вы управляете не просто машиной — вы управляете потоком людей. Это ответственно.',
  'Отличный водитель — это тот, о чьей работе не говорят. Потому что всё идёт гладко.',
  'Дорожная ситуация была непростой. Вы справились профессионально.',
  'Все рейсы завершены. Ни одного инцидента. Вот это работа!',
  'Вы не просто везёте — вы служите городу. И делаете это хорошо.',
  'Пассажиры спешат по своим делам. Вы помогаете им не опаздывать. Это важно.',
  'Водить в городском трафике — это настоящее искусство. Вы владеете им.',
  'Смена закрыта с честью. Отдыхайте, завтра снова в путь.',
  'Каждый день вы начинаете маршрут заново. И каждый раз — профессионально.',
  'Ваш спокойный характер за рулём — залог безопасности всего салона.',
  'Ни один пассажир не почувствовал беспокойства — потому что вы за рулём.',
  'Работа водителя — это марафон. Сегодня вы пробежали его достойно.',
  'Опытный водитель видит дорогу на несколько шагов вперёд. Вы видите.',
  'Сегодня вы отвезли домой сотни человек. Каждый из них благодарен.',
  'Маршрут — это ваша территория. Сегодня вы на ней были хозяином.',
  'Вы — связь между остановками и судьбами людей. Эта связь была надёжной.',
  'Устали? Это значит — поработали хорошо. Заслуженный отдых ждёт.',
  'Профессионал в кабине — это спокойствие для всего салона.',
  'Сегодня вы были примером того, каким должен быть водитель.',
  'Точное соблюдение расписания — результат вашего мастерства.',
  'За рулём весь день — и ни одной ошибки. Браво!',
  'Ваши пассажиры добрались — живые, здоровые, вовремя. Это главное.',
  'Водитель несёт на себе груз ответственности. Ваши плечи крепкие.',
  'Смена сложная, но вы опытный. Опыт всегда берёт верх.',
  'Знакомые маршруты — незнакомые ситуации. Вы справляетесь с любыми.',
  'Каждый пассажир — это чья-то мать, отец, ребёнок. Вы их доставляете безопасно.',
  'Уважение к дороге и пассажирам — это ваш стиль вождения.',
  'Ничего лишнего: маршрут, расписание, безопасность. Всё выполнено.',
  'Вы обеспечили сегодня связность городской жизни. Это не мало.',
  'Профессиональный водитель не гонит — он едет правильно. Это вы.',
  'Смена позади. Впереди — заслуженный отдых. Используйте его с пользой.',
  'Каждый километр сегодня — с заботой о пассажирах.',
  'Дорога — ваш рабочий стол. Сегодня на нём был порядок.',
  'Водитель — это человек, которому доверяют жизнь. Вы это доверие заслужили.',
  'Смена выполнена. Вы можете гордиться сегодняшним днём.',
  'Плавно, чётко, безопасно — именно так вы работаете.',
  'Транспорт ходит вовремя, потому что водят такие, как вы.',
  'Город в движении — благодаря вам в том числе.',
  'Сложный трафик не сбил вас с маршрута. Это профессионализм.',
  'Ваша смена была образцовой. Так и должно быть.',
  'Вы знаете свой маршрут наизусть. Но каждый день — как первый.',
  'Хороший водитель делает поездку комфортной. Вы — хороший водитель.',
  'Смена закрыта. Ваша работа говорит за себя.',
  'Благодаря вам кто-то успел на важную встречу. Это ценно.',
  'За день вы сделали больше, чем кажется. Осознайте это.',
  'Водить автобус — это большая ответственность. Вы принимаете её ежедневно.',
  'Маршрут пройден. Пассажиры довольны. Вы молодец.',
  'Опытный водитель не спешит — он едет правильно. Вы так и делаете.',
  'Сегодня вы снова доказали: работа — это не просто работа, это призвание.',
  'Усталость после смены — честная усталость. Отдыхайте хорошо.',
  'За рулём весь день, и всё под контролем. Редкое качество.',
  'Вы не просто выполняете маршрут — вы выполняете миссию.',
  'Каждый рейс — это маленький подвиг в большом городе.',
  'Смена прошла как надо. Завтра — снова в путь.',
  'Ваши пассажиры не знают вашего имени, но вы помогли им сегодня.',
  'Безопасная езда — это не везение, это мастерство. Ваше мастерство.',
  'Дорога наградила вас спокойной сменой. Вы её заслужили.',
  'Вы сделали сегодня то, что умеете делать лучше всех — работали.',
  'Спасибо, что были надёжны для своих пассажиров сегодня.',
  'До встречи на маршруте! Отдыхайте — завтра снова вперёд.',
  'Смена завершена достойно. Так держать, капитан маршрута!',
  'Вы дарите городу движение. Это важнее, чем кажется.',
  'Сегодня вы были частью чего-то большего — городской жизни.',
  'Настоящий профессионал всегда в форме. Вы подтвердили это сегодня.',
  'Дорога — это не просто асфальт. Это доверие. Вы его не подвели.',
  'Конец смены — начало отдыха. Вы его заслужили!',
  'За рулём — только лучшие. Вы один из них.',
  'Маршрут, расписание, безопасность — три кита вашей работы. Все устояли.',
  'Отличная смена! Город двигался — благодаря вам.',
  'Каждый день за рулём — это вклад в жизнь города. Ваш вклад значителен.',
  'Вы везёте не пассажиров — вы везёте чьи-то судьбы. И делаете это бережно.',
  'Смена завершена. Всё хорошо. Именно так и должно быть.',
  'Пассажиры едут — значит, всё идёт правильно. Ваша заслуга.',
  'Финал смены — время для гордости. Работа сделана.',
  'Вы — профессионал на своём месте. Сегодня это снова подтверждено.',
  'Городской транспорт держится на таких, как вы. Это не преувеличение.',
  'Смена пройдена. Маршруты выполнены. Вы — герой городского движения.',
  'Уважение пассажиров — в вашей надёжной езде. Сегодня оно было заслужено.',
  'Каждая смена — это история. Сегодняшняя — хорошая история.',
  'Дорога помнит своих мастеров. Вы — мастер.',
  'Спасибо за сегодняшний день. Город вам благодарен.',
  'До завтра, водитель. Ваш маршрут будет ждать.',
  'Смена закрыта. Хорошая работа — это ваш стандарт.',
  'Каждый день на маршруте — это вклад в жизнь тысяч людей.',
  'Вы вернули людей домой сегодня. Это самое важное.',
  'Профессионал знает цену каждому рейсу. Вы знаете.',
  'Смена позади — впереди отдых. Вы его честно заработали.',
  'За рулём нельзя расслабляться. Вы не расслаблялись. Отлично.',
  'Городской маршрут — это командная работа. Вы были лучшим игроком.',
  'Благодаря вам сотни людей добрались до цели сегодня.',
  'Сложные дороги, непростые пассажиры, ритм города — вы со всем справились.',
  'Работа водителя — это ответственность каждую секунду. Вы её несли достойно.',
  'Конец смены — начало нового дня. Отдохните хорошо.',
  'Хорошая смена — это когда о водителе говорят только хорошее. Это про вас.',
  'Смена выполнена. Вы сделали своё дело. До завтра!',
  'Ваша работа — это движение города. Сегодня оно было плавным.',
  'Спокойная езда, вежливость, пунктуальность — ваш профессиональный портрет.',
  'Смена прошла хорошо. Это результат вашего опыта и характера.',
  'Водитель городского транспорта — это служба, не просто работа. Вы служили достойно.',
  'Дорога сегодня была на вашей стороне. И вы были на высоте.',
  'Каждый рейс — это доверие. Спасибо, что оправдываете его каждый день.',
  'Смена закрыта с отличием. Так держать!',
  'Вы сделали всё правильно сегодня. Это лучшее, что можно сказать о работе.',
  'Маршрут пройден — пассажиры счастливы. Вот оно, настоящее удовлетворение.',
  'За рулём была надёжность. Это вы.',
  'Профессионал не жалуется на трудности — он их преодолевает. Вы преодолевали.',
  'Смена завершена красиво. До завтра, мастер дороги!',
  'Все рейсы выполнены. Всё в порядке. Это ваша работа.',
  'Городская жизнь продолжается благодаря таким, как вы.',
  'Вы провели сотни людей через город. Тихо и надёжно.',
  'Смена окончена. Берегите себя — завтра снова в путь.',
  'Каждый водитель уникален. Вы уникальны в своей надёжности.',
  'Спасибо за смену. Вы — часть того, что делает город живым.',
  'Дорога, маршрут, люди — всё под вашим надёжным управлением.',
  'Хорошие водители редки. Сегодня вы подтвердили свой класс.',
  'Смена завершена. Пора отдыхать. Завтра маршрут снова ждёт.',
  'Каждый километр сегодня — с любовью к профессии.',
  'Работа водителя часто незаметна. Но она незаменима. Это про вас.',
  'Вы дарили безопасность весь день. Это нелегко. Это ценно.',
  'Смена прошла в штатном режиме. Это победа, которую стоит ценить.',
  'Водитель — это лицо транспортной системы. Ваше лицо было достойным.',
  'Удачи на следующей смене! Сегодняшняя была отличной.',
  'Смена закрыта. Вы сделали это. Хорошая работа!',
  'Пассажиры едут домой — в том числе благодаря вам.',
  'Ваш маршрут сегодня — это маленький вклад в большое дело.',
  'Быть водителем — значит быть ответственным каждую минуту. Вы были.',
  'Смена позади. Завтра — новый день и новые рейсы. До встречи!',
  'Ваша надёжность за рулём — лучшая характеристика профессионала.',
  'Сегодня вы доказали: хороший водитель — это не случайность.',
  'Смена выполнена. Всё на своих местах. Это результат вашего труда.',
  'Вы сделали город чуточку лучше своей работой сегодня.',
  'Пассажиры, маршрут, безопасность — всё прошло гладко. Это вы.',
  'Ваша профессия — это непрерывное движение. Сегодня оно было правильным.',
  'Смена закрыта. Отдыхайте. Завтра снова за руль — с новыми силами!',
  'Каждая смена делает вас опытнее. Сегодня — снова.',
  'Водитель — хранитель порядка в движении. Вы справились.',
  'Смена завершена. Городские маршруты вам благодарны.',
  'Вы были на работе. Вы работали хорошо. Этого достаточно.',
  'До встречи на маршруте! Отдыхайте заслуженно.',
  'Смена прошла хорошо. Следующая будет ещё лучше.',
  'Каждая остановка — встреча с городом. Сегодня они были приятными.',
  'Вы несёте службу ежедневно. Это требует характера. Он у вас есть.',
  'Смена закончена. Маршрут пройден. Вы — молодец.',
  'Профессионал заканчивает смену с достоинством. Именно так — как вы.',
  'Сегодня вы ещё раз доказали: за рулём должны быть лучшие.',
  'Смена выполнена. Все пассажиры добрались. Всё хорошо.',
  'Вы — надёжный человек в ненадёжном трафике. Спасибо.',
  'До завтра! Маршрут будет ждать своего капитана.',
];

interface Props {
  open: boolean;
  driver: Driver;
  dispatcherName?: string;
  onClose: () => void;
  onConfirm: (rating: number) => void;
}

export default function EndShiftModal({ open, driver, dispatcherName, onClose, onConfirm }: Props) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, [open]);

  const phrase = useMemo(
    () => MOTIVATIONAL_PHRASES[Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open]
  );

  const timeStr = time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const weekday = time.toLocaleDateString('ru-RU', { weekday: 'long' });
  const dayMonth = time.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  const dispatcher = dispatcherName || 'Смирнова Е.В.';

  if (!open) return null;

  const activeRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl mx-4 portrait:mx-auto portrait:w-[90%] kiosk-surface rounded-3xl elevation-4 overflow-hidden animate-in zoom-in-95 duration-300" style={{ minHeight: '67vh' }}>

        {/* LANDSCAPE: горизонтальный layout без изменений */}
        <div className="landscape:flex landscape:h-full hidden" style={{ minHeight: '67vh' }}>

          {/* LEFT 35% */}
          <div className="w-[35%] bg-gradient-to-b from-[#152d52] to-[#1e3a5f] flex flex-col items-center justify-center gap-5 px-7 py-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-white/15 flex items-center justify-center">
                <Icon name="LogOut" size={38} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white text-center">Завершить смену</h2>
            </div>
            <div className="text-center">
              <div className="font-bold text-white tabular-nums leading-none" style={{ fontSize: '70px' }}>{timeStr}</div>
              <div className="text-white/60 text-xl capitalize mt-2">{weekday}</div>
              <div className="text-white/60 text-xl mt-1">{dayMonth}</div>
            </div>
          </div>

          {/* RIGHT 65% */}
          <div className="w-[65%] p-6 space-y-4 flex flex-col justify-center">
            <div className="bg-muted rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Icon name="User" size={22} className="text-primary" />
                </div>
                <div>
                  <div className="text-base text-muted-foreground">Водитель</div>
                  <div className="font-semibold text-foreground text-xl">{driver.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                  <Icon name="Route" size={22} className="text-accent-foreground" />
                </div>
                <div>
                  <div className="text-base text-muted-foreground">Маршрут</div>
                  <div className="font-semibold text-foreground text-xl">№{driver.routeNumber}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-success/15 flex items-center justify-center flex-shrink-0">
                  <Icon name="Bus" size={22} className="text-success" />
                </div>
                <div>
                  <div className="text-base text-muted-foreground">Транспортное средство</div>
                  <div className="font-semibold text-foreground text-xl">{driver.vehicleNumber}</div>
                </div>
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Icon name="Headset" size={20} className="text-primary" />
                <p className="text-lg text-muted-foreground">Оцените работу диспетчера</p>
              </div>
              <p className="text-xl font-semibold text-foreground">{dispatcher}</p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setRating(star)} onPointerEnter={() => setHoverRating(star)} onPointerLeave={() => setHoverRating(0)} className="p-1 transition-transform active:scale-90">
                    <Icon name="Star" size={42} className={`transition-colors ${star <= activeRating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`} />
                  </button>
                ))}
              </div>
              {rating > 0 && <p className="text-base text-muted-foreground">{rating <= 2 ? 'Спасибо за честную оценку' : rating <= 4 ? 'Хорошая оценка!' : 'Отличная оценка!'}</p>}
            </div>
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-center">
              <p className="text-lg font-bold text-foreground/80 italic leading-relaxed">«{phrase}»</p>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-4 rounded-2xl bg-muted text-foreground font-semibold text-xl transition-all active:scale-[0.97] ripple">Отменить</button>
              <button onClick={() => onConfirm(rating)} className="flex-1 py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-semibold text-xl flex items-center justify-center gap-3 transition-all active:scale-[0.97] ripple elevation-2">
                <Icon name="Hand" size={24} />До встречи
              </button>
            </div>
          </div>
        </div>

        {/* PORTRAIT: вертикальный layout */}
        <div className="portrait:flex landscape:hidden flex-col">

          {/* TOP — иконка + заголовок + время */}
          <div className="bg-gradient-to-b from-[#152d52] to-[#1e3a5f] flex flex-col items-center justify-center gap-4 px-8 py-7">
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-white/15 flex items-center justify-center">
                <Icon name="LogOut" size={38} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white text-center">Завершить смену</h2>
            </div>
            <div className="text-center">
              <div className="font-bold text-white tabular-nums leading-none" style={{ fontSize: '64px' }}>{timeStr}</div>
              <div className="text-white/60 text-lg capitalize mt-1">{weekday}</div>
              <div className="text-white/60 text-lg mt-0.5">{dayMonth}</div>
            </div>
          </div>

          {/* BOTTOM — всё остальное */}
          <div className="p-5 space-y-4 flex flex-col">
            <div className="bg-muted rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Icon name="User" size={22} className="text-primary" />
                </div>
                <div>
                  <div className="text-base text-muted-foreground">Водитель</div>
                  <div className="font-semibold text-foreground text-xl">{driver.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                  <Icon name="Route" size={22} className="text-accent-foreground" />
                </div>
                <div>
                  <div className="text-base text-muted-foreground">Маршрут</div>
                  <div className="font-semibold text-foreground text-xl">№{driver.routeNumber}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-success/15 flex items-center justify-center flex-shrink-0">
                  <Icon name="Bus" size={22} className="text-success" />
                </div>
                <div>
                  <div className="text-base text-muted-foreground">Транспортное средство</div>
                  <div className="font-semibold text-foreground text-xl">{driver.vehicleNumber}</div>
                </div>
              </div>
            </div>

            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Icon name="Headset" size={20} className="text-primary" />
                <p className="text-lg text-muted-foreground">Оцените работу диспетчера</p>
              </div>
              <p className="text-xl font-semibold text-foreground">{dispatcher}</p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setRating(star)} onPointerEnter={() => setHoverRating(star)} onPointerLeave={() => setHoverRating(0)} className="p-1 transition-transform active:scale-90">
                    <Icon name="Star" size={42} className={`transition-colors ${star <= activeRating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`} />
                  </button>
                ))}
              </div>
              {rating > 0 && <p className="text-base text-muted-foreground">{rating <= 2 ? 'Спасибо за честную оценку' : rating <= 4 ? 'Хорошая оценка!' : 'Отличная оценка!'}</p>}
            </div>

            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-center">
              <p className="text-lg font-bold text-foreground/80 italic leading-relaxed">«{phrase}»</p>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-4 rounded-2xl bg-muted text-foreground font-semibold text-xl transition-all active:scale-[0.97] ripple">Отменить</button>
              <button onClick={() => onConfirm(rating)} className="flex-1 py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-semibold text-xl flex items-center justify-center gap-3 transition-all active:scale-[0.97] ripple elevation-2">
                <Icon name="Hand" size={24} />До встречи
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}