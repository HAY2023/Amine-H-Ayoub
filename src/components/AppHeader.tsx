const AppHeader = () => {
  return (
    <header className="py-6">
      <div className="max-w-2xl mx-auto px-4 flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gold shadow-lg">
          <img
            src="/my-photo.png"
            alt="القارئ أمين حاج أيوب"
            className="w-full h-full object-cover object-[center_top]"
          />
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-gold text-center leading-relaxed">
          المصحف المرتل برواية ورش
          <br />
          القارئ أمين حاج أيوب
        </h1>
      </div>
    </header>
  );
};

export default AppHeader;
