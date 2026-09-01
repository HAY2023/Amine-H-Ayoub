import { useState, useEffect } from "react";
import { getCoins, getProfile, getProfiles, updateProfile, getActiveId, setActiveProfile } from "../data/kidsProfile";
import { getGameCatalog, setGameCost, resetGamePrices, type GameDef } from "../data/gameCatalog";

export default function DeveloperPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [amount, setAmount] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"users" | "games">("users");
  const [gameList, setGameList] = useState<GameDef[]>([]);
  const [editingGame, setEditingGame] = useState<string | null>(null);
  const [tempCost, setTempCost] = useState(0);
  useEffect(() => {
    if (open && authenticated) {
      setGameList(getGameCatalog());
    }
  }, [open, authenticated, refreshKey]);

  const handleLogin = () => {
    if (password === "2012") {
      setAuthenticated(true);
      setError("");
    } else {
      setError("كلمة المرور خاطئة!");
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setPassword("");
    setActiveTab("users");
  };

  const selectUser = (id: string) => {
        setActiveProfile(id);
    setRefreshKey(k => k + 1);
  };

  const handleAddCoins = (userId: string) => {
    if (amount > 0) {
      const profiles = getProfiles();
      const user = profiles.find(p => p.id === userId);
      if (user) {
        updateProfile(userId, { coins: (user.coins || 0) + amount });
        setRefreshKey(k => k + 1);
      }
    }
  };

  const handleRemoveCoins = (userId: string) => {
    if (amount > 0) {
      const profiles = getProfiles();
      const user = profiles.find(p => p.id === userId);
      if (user && (user.coins || 0) >= amount) {
        updateProfile(userId, { coins: (user.coins || 0) - amount });
        setRefreshKey(k => k + 1);
      }
    }
  };

  const handleSetCoins = (userId: string) => {
    if (amount >= 0) {
      updateProfile(userId, { coins: amount });
      setRefreshKey(k => k + 1);
    }
  };

  const handleResetUser = (userId: string) => {
    updateProfile(userId, { coins: 0 });
    setRefreshKey(k => k + 1);
  };

  const handleResetAll = () => {
    getProfiles().forEach(p => updateProfile(p.id, { coins: 0 }));
    setRefreshKey(k => k + 1);
  };

  const startEditGame = (game: GameDef) => {
    setEditingGame(game.id);
    setTempCost(game.cost);
  };

    const saveGameCost = (gameId: string) => {
    setGameCost(gameId, tempCost);
    setEditingGame(null);
    setRefreshKey(k => k + 1);
  };

    const handleResetGamePrices = () => {
    resetGamePrices();
    setRefreshKey(k => k + 1);
    };
  if (!open) return null;
  const profiles = getProfiles();
  const currentProfile = getProfile();
  const currentCoins = getCoins();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 border border-gray-600 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 px-8 py-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-4xl">🔧</span>
            <div>
              <h2 className="text-white font-bold text-2xl">لوحة تحكم المطور</h2>
              <p className="text-white/70 text-sm">تحكم كامل في المستخدمين والألعاب</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {authenticated && (
              <button onClick={handleLogout} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm">
                تسجيل خروج
              </button>
            )}
            <button onClick={onClose} className="text-white text-3xl hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center">✕</button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {!authenticated ? (
            /* Login Screen */
            <div className="max-w-md mx-auto py-12">
              <div className="text-center mb-8">
                <span className="text-6xl">🔐</span>
                <h3 className="text-white text-2xl font-bold mt-4">منطقة محمية</h3>
                <p className="text-gray-400 mt-2">أدخل كلمة مرور المطور للمتابعة</p>
              </div>
              <div className="space-y-4">
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  placeholder="كلمة المرور..."
                  className="w-full bg-gray-800 border-2 border-gray-600 focus:border-orange-500 rounded-xl px-6 py-4 text-white text-lg text-center"
                  autoFocus
                />
                <button
                  onClick={handleLogin}
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-4 rounded-xl font-bold text-lg transition-all">
                  دخول
                </button>
                {error && <p className="text-red-400 text-center">{error}</p>}
              </div>
              <p className="text-gray-600 text-center text-sm mt-8">اختصار لوحة المفاتيح: Ctrl + Alt + 2</p>
            </div>
          ) : (
            /* Main Panel */
            <div key={refreshKey}>
              {/* Tabs */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setActiveTab("users")}
                  className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${activeTab === "users" ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                  👥 المستخدمين
                </button>
                <button
                  onClick={() => setActiveTab("games")}
                  className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${activeTab === "games" ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                  🎮 الألعاب والأسعار
                </button>
              </div>

              {activeTab === "users" && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-orange-900/50 to-red-900/50 border border-orange-700 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-orange-400 text-sm">المستخدم النشط حالياً</p>
                        <h3 className="text-white font-bold text-2xl">{currentProfile.name || "بدون اسم"}</h3>
                        <p className="text-gray-400">العمر: {currentProfile.age}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-yellow-400 font-bold text-4xl">⭐ {currentCoins}</p>
                        <p className="text-gray-500 text-sm">نجوم</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(parseInt(e.target.value) || 0)}
                        className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white"
                        min={0}
                        placeholder="الكمية..."
                      />
                      <button onClick={() => handleAddCoins(currentProfile.id)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold">➕ إضافة</button>
                      <button onClick={() => handleRemoveCoins(currentProfile.id)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold">➖ إزالة</button>
                      <button onClick={() => handleSetCoins(currentProfile.id)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold">✏️ تعيين</button>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-2xl p-4">
                    <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                      <span>👥</span> جميع المستخدمين ({profiles.length})
                    </h4>
                    <div className="grid gap-3">
                      {profiles.map(p => (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between p-4 rounded-xl transition-all ${p.id === currentProfile.id ? "bg-orange-600/30 border border-orange-500" : "bg-gray-700/50 hover:bg-gray-700"}`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${p.id === currentProfile.id ? "bg-orange-600" : "bg-gray-600"}`}>
                              {p.id === currentProfile.id ? "⭐" : "👤"}
                            </div>
                            <div>
                              <p className="text-white font-bold">{p.name || "بدون اسم"}</p>
                              <p className="text-gray-400 text-sm">العمر: {p.age}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-yellow-400 font-bold text-xl">⭐ {p.coins || 0}</span>
                            {p.id !== currentProfile.id && (
                              <button
                                onClick={() => selectUser(p.id)}
                                className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-lg text-sm">
                                تفعيل
                              </button>
                            )}
                            <button
                              onClick={() => handleResetUser(p.id)}
                              className="bg-red-900/50 border border-red-700 text-red-300 px-3 py-1 rounded-lg text-sm">
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>




                  <button
                    onClick={handleResetAll}
                    className="w-full bg-red-900/50 border-2 border-red-700 text-red-300 py-4 rounded-xl font-bold text-lg hover:bg-red-900/70 transition-all">
                    🗑️ تصفير نجوم جميع المستخدمين
                  </button>
                </div>
              )}

              {activeTab === "games" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold text-xl">🎮 قائمة الألعاب ({gameList.length} لعبة)</h3>
                    <button
                                            onClick={handleResetGamePrices}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
                      🔄 إعادة تعيين الأسعار الافتراضية
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {gameList.map(game => (
                      <div key={game.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-white font-bold">{game.title}</h4>
                            <p className="text-gray-400 text-sm">الفئة: {game.ageMin}-{game.ageMax || "∞"} سنة</p>
                            <p className="text-gray-500 text-xs">النوع: {game.engine}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${game.tint}`}>
                            ⭐ {game.cost}
                          </span>
                        </div>

                        {editingGame === game.id ? (
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={tempCost}
                              onChange={e => setTempCost(parseInt(e.target.value) || 0)}
                              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                              min={0}
                            />
                            <button
                              onClick={() => saveGameCost(game.id)}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingGame(null)}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg">
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditGame(game)}
                            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm">
                            ✏️ تعديل السعر
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}