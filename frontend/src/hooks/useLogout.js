// frontend/src/hooks/useLogout.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { logout } from '../lib/api';
import toast from 'react-hot-toast';
import { clearToken } from '../lib/authToken';

const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const { mutate: logoutMutation, isPending, error } = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      console.log("Logout successful");
      clearToken();
      
      // Clear auth user from cache
      queryClient.setQueryData(["authUser"], null);
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      
      toast.success("Logged out successfully");
      navigate("/login");
    },
    onError: (error) => {
      // The local session must go even if the server call failed.
      console.error("Logout error:", error);
      clearToken();
      queryClient.setQueryData(["authUser"], null);
      navigate("/login");
      toast.error("Logout failed");
    },
  });
  
  return { logoutMutation, isPending, error };
};

export default useLogout;