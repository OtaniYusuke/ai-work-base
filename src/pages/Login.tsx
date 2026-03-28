import { useNavigate } from 'react-router-dom';
import { users, ROLE_LABELS } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (userId: string) => {
    login(userId);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-800">
            AI Workflow Operating System
          </h1>
          <p className="mt-2 text-slate-500">
            ログインするユーザーを選択してください
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleLogin(user.id)}
              className="bg-white rounded-xl border border-slate-200 p-5 text-left
                         hover:border-cyan-400 hover:shadow-md hover:shadow-cyan-50
                         transition-all duration-200 group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-cyan-600 text-white
                                flex items-center justify-center text-sm font-bold
                                group-hover:bg-cyan-500 transition-colors">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{user.name}</div>
                  <div className="text-xs text-slate-400">{user.department}</div>
                </div>
              </div>
              <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full
                               bg-cyan-50 text-cyan-700">
                {ROLE_LABELS[user.role]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
