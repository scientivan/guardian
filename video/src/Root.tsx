import { AbsoluteFill, Composition, Sequence } from "remotion";
import { Background, SpeakerFrames, Subtitles } from "./Frame";
import { Disclaimer, Intro, Problem } from "./scenes/Opening";
import { Recorded } from "./scenes/Recorded";
import { End, Results } from "./scenes/Closing";
import { FPS, H, W } from "./theme";
import { SCENES, TOTAL } from "./timeline";

export type Props = { speaker1Src?: string; speaker2Src?: string; speaker1Name: string; speaker2Name: string };

const VIEWS: Record<string, (p: { scene: (typeof SCENES)[number] }) => React.ReactNode> = {
  disclaimer: () => <Disclaimer />,
  problem: ({ scene }) => <Problem scene={scene} />,
  intro: ({ scene }) => <Intro scene={scene} />,
  setup: ({ scene }) => <Recorded scene={scene} />,
  bill: ({ scene }) => <Recorded scene={scene} />,
  pay: ({ scene }) => <Recorded scene={scene} />,
  refund: ({ scene }) => <Recorded scene={scene} />,
  security: ({ scene }) => <Recorded scene={scene} />,
  close: ({ scene }) => <Recorded scene={scene} />,
  results: ({ scene }) => <Results scene={scene} />,
  end: ({ scene }) => <End scene={scene} />,
};

export function GuardianDemo({ speaker1Src, speaker2Src, speaker1Name, speaker2Name }: Props) {
  return (
    <AbsoluteFill>
      <style>{`.fill{width:100%;height:100%;display:block}`}</style>
      <Background />
      {SCENES.map((s) => (
        <Sequence key={s.id} from={s.from} durationInFrames={s.frames} name={s.id}>
          {VIEWS[s.id]?.({ scene: s })}
          <Subtitles lines={s.lines} />
        </Sequence>
      ))}
      <SpeakerFrames speaker1Src={speaker1Src} speaker2Src={speaker2Src} names={[speaker1Name, speaker2Name]} />
    </AbsoluteFill>
  );
}

export function RemotionRoot() {
  return (
    <Composition id="GuardianDemo" component={GuardianDemo} durationInFrames={TOTAL} fps={FPS} width={W} height={H}
      defaultProps={{ speaker1Name: "Dien", speaker2Name: "Aurel" } satisfies Props} />
  );
}
