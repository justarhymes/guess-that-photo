import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import CreateRoomPage from "./pages/CreateRoomPage.jsx";
import RoomPage from "./pages/RoomPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

export default function App() {
  return (
    <>
      <main className='flex flex-col justify-center items-center min-h-screen text-white text-base'>
        <Routes>
          <Route path='/' element={<HomePage />} />
          <Route path='/room/new' element={<CreateRoomPage />} />
          <Route path='/room/:roomId' element={<RoomPage />} />
          <Route path='*' element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}
