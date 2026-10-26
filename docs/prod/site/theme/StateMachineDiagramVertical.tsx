type StateBoxProps = {
  action: string;
  current: boolean;
  status: string;
  width: number;
  x: number;
  y: number;
};

function StateBox({
  action,
  current,
  status,
  width,
  x,
  y,
}: StateBoxProps): JSX.Element {
  return (
    <g className={`state-diagram__state ${current ? "is-current" : ""}`}>
      <rect x={x} y={y} width={width} height="70" rx="13" />
      <line x1={x} y1={y + 38} x2={x + width} y2={y + 38} />
      <text
        className="state-diagram__status"
        x={x + width / 2}
        y={y + 24}
        textAnchor="middle"
      >
        {status}
      </text>
      <text
        className="state-diagram__action"
        x={x + width / 2}
        y={y + 57}
        textAnchor="middle"
      >
        do / {action}
      </text>
    </g>
  );
}

type StateMachineDiagramProps = {
  currentStatus: string;
};

export function StateMachineDiagramVertical({
  currentStatus,
}: StateMachineDiagramProps): JSX.Element {
  return (
    <div className="state-diagram__canvas" aria-label="Схема переходов заявки">
      <svg
        viewBox="0 0 700 900"
        role="img"
        aria-labelledby="state-diagram-title state-diagram-description"
      >
        <title id="state-diagram-title">
          Переходы заявки между состояниями
        </title>
        <desc id="state-diagram-description">
          Основной путь заявки от черновика до завершения выдачи, возврат на
          уточнение и отдельные исходы.
        </desc>
        <defs>
          <marker
            id="state-arrow"
            markerHeight="7"
            markerWidth="7"
            orient="auto-start-reverse"
            refX="6"
            refY="3.5"
            viewBox="0 0 7 7"
          >
            <path d="M0,0 L7,3.5 L0,7 Z" />
          </marker>
          <marker
            id="state-arrow-accent"
            markerHeight="7"
            markerWidth="7"
            orient="auto-start-reverse"
            refX="6"
            refY="3.5"
            viewBox="0 0 7 7"
          >
            <path d="M0,0 L7,3.5 L0,7 Z" />
          </marker>
        </defs>

        <text
          className="state-diagram__lane-label"
          x="310"
          y="18"
          textAnchor="middle"
        >
          ОСНОВНОЙ МАРШРУТ
        </text>
        <circle className="state-diagram__start" cx="310" cy="38" r="8" />
        <line
          className="state-diagram__line"
          markerEnd="url(#state-arrow)"
          x1="310"
          x2="310"
          y1="46"
          y2="70"
        />
        <text className="state-diagram__transition" x="326" y="61">
          создал
        </text>

        <StateBox
          action="edit"
          current={currentStatus === "DRAFT"}
          status="DRAFT"
          width={220}
          x={200}
          y={70}
        />
        <line
          className="state-diagram__line"
          markerEnd="url(#state-arrow)"
          x1="310"
          x2="310"
          y1="140"
          y2="168"
        />
        <text className="state-diagram__transition" x="326" y="160">
          отправил
        </text>
        <StateBox
          action="accept"
          current={currentStatus === "SUBMITTED"}
          status="SUBMITTED"
          width={220}
          x={200}
          y={168}
        />
        <line
          className="state-diagram__line"
          markerEnd="url(#state-arrow)"
          x1="310"
          x2="310"
          y1="238"
          y2="270"
        />
        <text className="state-diagram__transition" x="326" y="260">
          принято
        </text>

        <g
          className={`state-diagram__decision ${currentStatus === "VALIDATING" ? "is-current" : ""}`}
        >
          <polygon points="310,270 350,310 310,350 270,310" />
          <text
            className="state-diagram__status"
            x="310"
            y="306"
            textAnchor="middle"
          >
            VALIDATING
          </text>
          <text
            className="state-diagram__action"
            x="310"
            y="322"
            textAnchor="middle"
          >
            check
          </text>
        </g>
        <line
          className="state-diagram__line"
          markerEnd="url(#state-arrow)"
          x1="310"
          x2="310"
          y1="350"
          y2="385"
        />
        <text className="state-diagram__transition" x="326" y="375">
          пройдены
        </text>
        <StateBox
          action="review"
          current={currentStatus === "UNDER_REVIEW"}
          status="UNDER_REVIEW"
          width={220}
          x={200}
          y={385}
        />

        <path
          className="state-diagram__line state-diagram__line--accent"
          d="M270 310 H16 V503 H32"
          markerEnd="url(#state-arrow-accent)"
        />
        <text className="state-diagram__transition" x="24" y="330">
          из VALIDATING
        </text>
        <path
          className="state-diagram__line state-diagram__line--accent"
          d="M200 420 H112 V468"
          markerEnd="url(#state-arrow-accent)"
        />
        <text className="state-diagram__transition" x="20" y="412">
          нужны сведения
        </text>
        <StateBox
          action="ask"
          current={currentStatus === "NEEDS_INFO"}
          status="NEEDS_INFO"
          width={160}
          x={32}
          y={468}
        />
        <path
          className="state-diagram__line state-diagram__line--accent"
          d="M112 468 V440 H168 V420 H200"
          markerEnd="url(#state-arrow-accent)"
        />
        <text className="state-diagram__transition" x="20" y="452">
          ответ клиента
        </text>

        <line
          className="state-diagram__line"
          markerEnd="url(#state-arrow)"
          x1="310"
          x2="310"
          y1="455"
          y2="500"
        />
        <text className="state-diagram__transition" x="326" y="485">
          одобрено
        </text>
        <StateBox
          action="offer"
          current={currentStatus === "OFFERED"}
          status="OFFERED"
          width={220}
          x={200}
          y={500}
        />
        <path
          className="state-diagram__line state-diagram__line--muted"
          d="M200 560 H12 V420 H200"
          markerEnd="url(#state-arrow)"
        />
        <text className="state-diagram__transition" x="24" y="578">
          перехват менеджера
        </text>
        <path
          className="state-diagram__line state-diagram__line--muted"
          d="M420 560 H448"
        />
        <text className="state-diagram__transition" x="424" y="578">
          клиент отклонил
        </text>
        <line
          className="state-diagram__line"
          markerEnd="url(#state-arrow)"
          x1="310"
          x2="310"
          y1="570"
          y2="602"
        />
        <text className="state-diagram__transition" x="326" y="592">
          принял
        </text>
        <StateBox
          action="accept"
          current={currentStatus === "ACCEPTED"}
          status="ACCEPTED"
          width={220}
          x={200}
          y={602}
        />
        <line
          className="state-diagram__line"
          markerEnd="url(#state-arrow)"
          x1="310"
          x2="310"
          y1="672"
          y2="704"
        />
        <text className="state-diagram__transition" x="326" y="694">
          подтвердил
        </text>
        <StateBox
          action="sign"
          current={currentStatus === "SIGNING"}
          status="SIGNING"
          width={220}
          x={200}
          y={704}
        />
        <line
          className="state-diagram__line"
          markerEnd="url(#state-arrow)"
          x1="310"
          x2="310"
          y1="774"
          y2="788"
        />

        <g
          className={`state-diagram__terminal ${currentStatus === "FUNDED" ? "is-current" : ""}`}
        >
          <circle cx="310" cy="814" r="27" />
          <circle cx="310" cy="814" r="20" />
          <text
            className="state-diagram__status"
            x="310"
            y="811"
            textAnchor="middle"
          >
            FUNDED
          </text>
          <text
            className="state-diagram__action"
            x="310"
            y="826"
            textAnchor="middle"
          >
            done
          </text>
        </g>

        <text
          className="state-diagram__lane-label"
          x="570"
          y="318"
          textAnchor="middle"
        >
          УПРАВЛЯЮЩИЕ ИСХОДЫ
        </text>
        <path
          className="state-diagram__line"
          d="M420 420 H520 V390 H540"
          markerEnd="url(#state-arrow)"
        />
        <line
          className="state-diagram__line"
          x1="520"
          x2="520"
          y1="390"
          y2="610"
        />
        <line
          className="state-diagram__line"
          markerEnd="url(#state-arrow)"
          x1="520"
          x2="540"
          y1="500"
          y2="500"
        />
        <line
          className="state-diagram__line"
          markerEnd="url(#state-arrow)"
          x1="520"
          x2="540"
          y1="610"
          y2="610"
        />
        <text
          className="state-diagram__transition"
          x="690"
          y="350"
          textAnchor="end"
        >
          любой нефинальный статус
        </text>
        <g className="state-diagram__outcome state-diagram__outcome--rejected">
          <polygon points="570,360 600,390 570,420 540,390" />
          <text x="570" y="394" textAnchor="middle">
            REJECTED
          </text>
          <text
            className="state-diagram__outcome-action"
            x="570"
            y="448"
            textAnchor="middle"
          >
            менеджер / REJECT
          </text>
        </g>
        <g className="state-diagram__outcome state-diagram__outcome--cancelled">
          <circle cx="570" cy="500" r="30" />
          <text x="570" y="504" textAnchor="middle">
            CANCELLED
          </text>
          <text
            className="state-diagram__outcome-action"
            x="570"
            y="552"
            textAnchor="middle"
          >
            клиент или менеджер
          </text>
        </g>
        <g className="state-diagram__outcome state-diagram__outcome--blocked">
          <polygon points="570,585 590,595 602,617 590,639 565,645 545,628 540,605 554,590" />
          <text x="570" y="620" textAnchor="middle">
            BLOCKED
          </text>
          <text
            className="state-diagram__outcome-action"
            x="570"
            y="670"
            textAnchor="middle"
          >
            менеджер / BLOCK
          </text>
        </g>
        <line
          className="state-diagram__line"
          markerEnd="url(#state-arrow)"
          x1="570"
          x2="570"
          y1="645"
          y2="700"
        />
        <rect
          className="state-diagram__control"
          x="530"
          y="700"
          width="80"
          height="38"
          rx="8"
        />
        <text
          className="state-diagram__control-label"
          x="570"
          y="724"
          textAnchor="middle"
        >
          UNBLOCK
        </text>
        <text
          className="state-diagram__transition"
          x="570"
          y="774"
          textAnchor="middle"
        >
          к статусу до блокировки
        </text>
      </svg>
    </div>
  );
}
