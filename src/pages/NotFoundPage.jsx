import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <>
      <h1 className='text-6xl font-bold mb-4 text-white font-dynapuff'>
        404 - Not Found
      </h1>
      <p className='mb-10'>We lost that room key. Try starting over?</p>
      <Link
        className='inline-block transition bg-rose-500 hover:bg-rose-600 shadow-md hover:shadow-lg text-white rounded py-4 px-8 text-xl font-bold uppercase'
        to='/'>
        Return Home
      </Link>
    </>
  );
}
