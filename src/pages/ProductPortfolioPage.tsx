import { PageHeader, Card } from '@/components/ui';
import { PackageOpen, Sparkles } from 'lucide-react';

export function ProductPortfolioPage() {
  return (
    <div className="min-h-full bg-slate-50/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-8">
        <PageHeader
          title="Portfólio de Produtos"
          subtitle="Espaço reservado para centralizar os produtos da operação."
        />

        <Card className="p-8">
          <div className="max-w-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <PackageOpen className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-950 mt-5">Em construção</h2>
            <p className="text-sm text-slate-500 mt-2 leading-6">
              O menu já está criado e a área está pronta para receber a estrutura do portfólio. Nenhum campo ou regra de produto foi inventado nesta etapa.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              <Sparkles className="w-3.5 h-3.5" />
              Próxima etapa: definir o conteúdo do portfólio
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
