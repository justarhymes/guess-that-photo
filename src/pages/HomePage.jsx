import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div class='container mx-auto flex flex-col justify-center items-center'>
      <h1 className='text-6xl font-bold text-white font-dynapuff mb-10'>
        Who the heck?!
      </h1>
      <button
        className='transition bg-rose-500 hover:bg-rose-600 shadow-md hover:shadow-lg text-white rounded py-4 px-8 text-xl font-bold uppercase'
        onClick={() => navigate("/room/new")}>
        Start a New Room
      </button>
    </div>
  );
}
