import Focus from "./Focus";
import StudyRoomPanel from "../components/StudyRoomPanel";

// One controller serves the Focus page, Study Rooms and background dock.
export default function StudyRooms({ view = "study-rooms", onRoomActive }) {
  return <Focus RoomPanel={StudyRoomPanel} view={view} onRoomActive={onRoomActive} />;
}
