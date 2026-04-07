const AppHeader = () => {
  return (
    <header className="bg-primary py-6 shadow-lg">
      <div className="max-w-2xl mx-auto px-4 flex items-center justify-center gap-4">
        {/* Logo placeholder */}
        <div className="w-14 h-14 rounded-full bg-secondary/30 border-2 border-gold flex items-center justify-center shrink-0">
          <span className="text-primary-foreground text-2xl">☪</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground tracking-wide">
          مصحف الترداد التعليمي
        </h1>
      </div>
    </header>
  );
};

export default AppHeader;
