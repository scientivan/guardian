import { Composition } from "remotion";
import { FiveMinute } from "./FiveMinute";

export function RemotionRoot() {
  return (
    <Composition
      id="GuardianDemo"
      component={FiveMinute}
      durationInFrames={8940}
      fps={30}
      width={1920}
      height={1080}
    />
  );
}
