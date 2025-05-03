import { Route, Routes } from "react-router-dom"
import AuthLayout from "./_auth/AuthLayout"
import RootLayout from "./_root/RootLayout"
import Signin from "./_auth/forms/Signin"
import Signup from "./_auth/forms/Signup"
import Home from "./_root/pages/Home"
import AddPost from "./_root/pages/AddPost"
import Saved from "./_root/pages/Saved"
import Profile from "./_root/pages/Profile"
import EditProfile from "./_root/pages/EditProfile"
import EditPost from "./_root/pages/EditPost"
import Subscribers from "./_root/pages/Subscribers"
import Comments from "./_root/pages/Comments"

function App() {

  return (
    <main className="flex h-screen">
      <Routes>
      <Route element={<AuthLayout />}>
          <Route path="/sign-in" element={<Signin />} />
          <Route path="/sign-up" element={<Signup />} />
        </Route>

        <Route element={<RootLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/add-post" element={<AddPost />} />
          <Route path="/saved/:id" element={<Saved />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/edit/:userId" element={<EditProfile />} />
          <Route path="/comments/:postId" element={<Comments />} />
          <Route path="/edit-post/:postId" element={<EditPost />} />
          <Route path="/subscribers/:userId" element={<Subscribers />} />
        </Route>
      </Routes>
    </main>
  )
}

export default App