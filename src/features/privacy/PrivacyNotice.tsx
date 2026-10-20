/** Short factual notice shared by first-use information and Settings. */
export function PrivacyNotice() {
  return (
    <div className="flex flex-col gap-3 text-base text-ink-soft">
      <p className="m-0">
        Dina träningspass, besvärsanteckningar och inställningar sparas lokalt i
        den här webbläsaren. Uppgifterna skickas inte automatiskt till någon
        server. Stomme använder ingen besöksanalys.
      </p>
      <p className="m-0">
        Du väljer själv om du vill exportera eller dela en säkerhetskopia. Den
        innehåller dina tränings- och besvärsuppgifter. Du kan radera appens
        uppgifter via Radera all data i Inställningar. Exporterade filer behöver
        du radera separat.
      </p>
      <p className="m-0">
        Webbplatsen levereras via GitHub Pages. GitHub loggar besökares
        IP-adresser för säkerhet.
      </p>
      <a
        href="https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection"
        target="_blank"
        rel="noreferrer"
        className="flex min-h-12 items-center self-start text-base font-bold text-ink underline"
      >
        Läs om GitHub Pages och besöksuppgifter
      </a>
    </div>
  );
}
