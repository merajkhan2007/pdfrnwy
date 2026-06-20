'use client';

import { useTranslations } from 'next-intl';
import { Tool, ToolContent, HowToStep, UseCase, FAQ, ToolCategory } from '@/types/tool';
import { Card } from '@/components/ui/Card';
import { getToolById } from '@/config/tools';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { type Locale, getLocalizedPath } from '@/lib/i18n/config';
import { ToolProvider } from '@/lib/contexts/ToolContext';
import { getToolIcon } from '@/config/icons';
import Link from 'next/link';
import { 
  Home, ChevronRight, Sparkles, Zap, ShieldCheck, Globe, 
  Trash2, Lock, EyeOff, UserMinus, ChevronDown 
} from 'lucide-react';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { useMemo, useState } from 'react';
import { sanitizeHtml } from '@/lib/utils/html-sanitizer';

export interface ToolPageProps {
  /** Tool data */
  tool: Tool;
  /** Tool content for SEO and documentation */
  content: ToolContent;
  /** Current locale */
  locale: string;
  /** Children for the tool interface area */
  children?: React.ReactNode;
  /** Localized content for related tools */
  localizedRelatedTools?: Record<string, { title: string; description: string }>;
}

function SecuritySection() {
  const items = [
    { icon: Trash2, text: 'Files auto-deleted after processing' },
    { icon: Lock, text: 'SSL secured connection' },
    { icon: EyeOff, text: 'Privacy protected, no server logs' },
    { icon: UserMinus, text: 'No registration required' }
  ];

  return (
    <div className="mt-8 flex flex-wrap justify-center items-center gap-6 py-4 px-6 bg-[hsl(var(--color-muted))/0.3] rounded-[16px] border border-[hsl(var(--color-border))]/40 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 text-xs text-[hsl(var(--color-muted-foreground))] font-semibold">
          <item.icon className="w-4 h-4 text-[hsl(var(--color-primary))]" />
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  );
}

function TrustIndicators() {
  const features = [
    {
      icon: Sparkles,
      title: 'Easy to Use',
      description: 'Simple 3-step processes designed for speed, clarity, and non-technical users.'
    },
    {
      icon: Zap,
      title: 'Fast & Reliable',
      description: 'High-performance local compilation keeps processing fast, secure, and responsive.'
    },
    {
      icon: ShieldCheck,
      title: '100% Secure',
      description: 'Your documents never leave your browser. Zero uploads, 100% client-side privacy.'
    },
    {
      icon: Globe,
      title: 'Works Anywhere',
      description: 'Access the full suite on any browser, system, desktop, or mobile device.'
    }
  ];

  return (
    <section className="mt-24 py-12 border-t border-[hsl(var(--color-border))]/60">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-extrabold tracking-tight text-[hsl(var(--color-foreground))] mb-3">
          Designed for Trust and Speed
        </h2>
        <p className="text-[hsl(var(--color-muted-foreground))] max-w-lg mx-auto text-sm font-medium">
          PDFRunway handles your documents locally, keeping data secure and processing lightning-fast.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto px-4">
        {features.map((feat, idx) => (
          <div key={idx} className="bg-white border border-[hsl(var(--color-border))]/60 rounded-[24px] p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF5FA2]/10 to-[#7C5CFF]/10 flex items-center justify-center mb-4">
              <feat.icon className="w-6 h-6 text-[hsl(var(--color-primary))]" />
            </div>
            <h3 className="font-bold text-lg text-[hsl(var(--color-foreground))] mb-2">{feat.title}</h3>
            <p className="text-sm text-[hsl(var(--color-muted-foreground))] leading-relaxed">{feat.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const categoryTranslationKeys: Record<ToolCategory, string> = {
  'edit-annotate': 'editAnnotate',
  'convert-to-pdf': 'convertToPdf',
  'convert-from-pdf': 'convertFromPdf',
  'organize-manage': 'organizeManage',
  'optimize-repair': 'optimizeRepair',
  'secure-pdf': 'securePdf',
};

/**
 * ToolPage layout component provides the structure for individual tool pages.
 * Includes tool interface, description, how-to, use cases, FAQ, and related tools.
 */
export function ToolPage({ tool, content, locale, children, localizedRelatedTools = {} }: ToolPageProps) {
  // Get related tools data
  const relatedTools = tool.relatedTools
    .map(id => getToolById(id))
    .filter((t): t is Tool => t !== undefined);

  const t = useTranslations();

  // Get tool display name
  const toolDisplayName = content.title || tool.id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <ToolProvider toolSlug={tool.slug} toolName={toolDisplayName}>
      <div className="min-h-screen flex flex-col" data-testid="tool-page">
        <Header locale={locale as Locale} />

        <main id="main-content" className="flex-1" tabIndex={-1}>
          <div className="max-w-7xl mx-auto px-4 pt-24 pb-8">
            {/* Breadcrumb Navigation */}
            <nav aria-label="Breadcrumb" className="mb-4 flex items-center text-sm text-[hsl(var(--color-muted-foreground))] animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
              <Link
                href={getLocalizedPath('/', locale as Locale)}
                className="flex items-center hover:text-[hsl(var(--color-primary))] transition-colors"
                title={t('common.navigation.home')}
              >
                <Home className="w-4 h-4" />
              </Link>
              <ChevronRight className="w-4 h-4 mx-2 text-[hsl(var(--color-border))]" />
              <Link
                href={getLocalizedPath('/tools', locale as Locale)}
                className="hover:text-[hsl(var(--color-primary))] transition-colors"
              >
                {t('common.navigation.tools')}
              </Link>
              <ChevronRight className="w-4 h-4 mx-2 text-[hsl(var(--color-border))]" />
              <Link
                href={getLocalizedPath(`/tools/category/${tool.category}`, locale as Locale)}
                className="hover:text-[hsl(var(--color-primary))] transition-colors"
              >
                {t(`home.categories.${categoryTranslationKeys[tool.category]}`)}
              </Link>
              <ChevronRight className="w-4 h-4 mx-2 text-[hsl(var(--color-border))]" />
              <span className="font-medium text-[hsl(var(--color-foreground))] truncate max-w-[200px] sm:max-w-md" aria-current="page">
                {content.title || toolDisplayName}
              </span>
            </nav>

            {/* Tool Header */}
            <ToolHeader tool={tool} content={content} />

            {/* Tool Interface Area */}
            <section
              className="mt-6"
              data-testid="tool-page-interface"
              aria-label="Tool interface"
            >
              {children}
            </section>

            {/* Security Section */}
            <SecuritySection />

            {/* Trust Indicators Section */}
            <TrustIndicators />

            {/* How to Use Section */}
            <HowToUseSection steps={content.howToUse} />

            {/* Description Section */}
            <DescriptionSection description={content.description} />

            {/* Use Cases Section */}
            <UseCasesSection useCases={content.useCases} />

            {/* FAQ Section */}
            <FAQSection faq={content.faq} />

            {/* Related Tools Section */}
            <RelatedToolsSection
              tools={relatedTools}
              locale={locale}
              localizedRelatedTools={localizedRelatedTools}
            />
          </div>
        </main>

        <Footer locale={locale as Locale} />
      </div>
    </ToolProvider>
  );
}

/**
 * Tool header with icon, name, and brief description
 */
interface ToolHeaderProps {
  tool: Tool;
  content: ToolContent;
}

function ToolHeader({ tool, content }: ToolHeaderProps) {
  const toolName = tool.id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const IconComponent = getToolIcon(tool.icon);

  const formatTitle = (title: string) => {
    if (!title) return '';
    const regex = /(PDFs?)/gi;
    const parts = title.split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? <span key={index} className="text-gradient-primary font-black">{part}</span> : part
    );
  };

  return (
    <header className="text-center" data-testid="tool-page-header" itemScope itemType="https://schema.org/SoftwareApplication">
      <meta itemProp="applicationCategory" content="UtilitiesApplication" />
      <meta itemProp="operatingSystem" content="Web Browser" />
      <meta itemProp="offers" itemScope itemType="https://schema.org/Offer" content="" />
      <meta itemProp="price" content="0" />
      <meta itemProp="priceCurrency" content="USD" />
      <div
        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--color-primary)/0.1)] to-[hsl(var(--color-accent)/0.1)] mb-4 shadow-inner"
        aria-hidden="true"
      >
        <IconComponent className="w-8 h-8 text-[hsl(var(--color-primary))]" />
      </div>
      <h1
        className="text-4xl sm:text-5xl font-extrabold text-[hsl(var(--color-foreground))] mb-4 tracking-tight leading-tight"
        data-testid="tool-page-title"
        itemProp="name"
      >
        {formatTitle(content.title || toolName)}
      </h1>
      <p
        className="text-base sm:text-lg text-[hsl(var(--color-muted-foreground))] max-w-2xl mx-auto leading-relaxed mb-6 font-medium"
        data-testid="tool-page-subtitle"
        itemProp="description"
      >
        {content.metaDescription}
      </p>
      <div className="flex items-center justify-center">
        <FavoriteButton toolId={tool.id} size="lg" showLabel />
      </div>
    </header>
  );
}

/**
 * Description section with detailed tool information
 */
interface DescriptionSectionProps {
  description: string;
}

function DescriptionSection({ description }: DescriptionSectionProps) {
  const t = useTranslations();
  const sanitizedDescription = useMemo(() => sanitizeHtml(description), [description]);
  if (!description) return null;

  return (
    <section
      className="mt-10"
      data-testid="tool-page-description"
      aria-labelledby="description-heading"
    >
      <h2
        id="description-heading"
        className="text-2xl font-bold text-[hsl(var(--color-foreground))] mb-6"
      >
        {t('tools.about')}
      </h2>
      <Card variant="outlined" size="lg" className="glass-card">
        <div
          className="prose prose-sm max-w-none text-[hsl(var(--color-foreground))/0.8]"
          dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
        />
      </Card>
    </section>
  );
}

/**
 * How to use section with numbered steps
 */
interface HowToUseSectionProps {
  steps: HowToStep[];
}

function HowToUseSection({ steps }: HowToUseSectionProps) {
  const t = useTranslations();
  if (!steps || steps.length === 0) return null;

  return (
    <section
      className="mt-20 py-12 border-t border-[hsl(var(--color-border))]/60"
      data-testid="tool-page-how-to-use"
      aria-labelledby="how-to-use-heading"
      itemScope
      itemType="https://schema.org/HowTo"
    >
      <div className="text-center mb-12">
        <h2
          id="how-to-use-heading"
          className="text-3xl font-extrabold tracking-tight text-[hsl(var(--color-foreground))] mb-3"
          itemProp="name"
        >
          {t('tools.howToUse')}
        </h2>
        <p className="text-[hsl(var(--color-muted-foreground))] max-w-lg mx-auto text-sm font-medium">
          Follow these three simple steps to process your file in seconds.
        </p>
      </div>
      <div className="relative max-w-5xl mx-auto px-4 mt-8">
        {/* Horizontal Connector Line for Desktop */}
        <div className="hidden md:block absolute top-[28px] left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-[#FF5FA2]/40 to-[#7C5CFF]/40 z-0" />
        
        <ol className="grid gap-8 md:grid-cols-3 relative z-10" data-testid="how-to-use-steps">
          {steps.map((step) => (
            <li
              key={step.step}
              className="flex flex-col items-center text-center"
              data-testid={`how-to-step-${step.step}`}
              id={`step-${step.step}`}
              itemScope
              itemProp="step"
              itemType="https://schema.org/HowToStep"
            >
              <meta itemProp="position" content={String(step.step)} />
              <div
                className="w-14 h-14 rounded-full bg-white border-2 border-[hsl(var(--color-primary))] text-[hsl(var(--color-primary))] flex items-center justify-center font-bold text-xl mb-4 shadow-md z-10 relative"
                aria-hidden="true"
              >
                {step.step}
              </div>
              <h3 className="text-lg font-bold text-[hsl(var(--color-foreground))] mb-2" itemProp="name">
                {step.title}
              </h3>
              <p className="text-sm text-[hsl(var(--color-muted-foreground))] max-w-xs leading-relaxed" itemProp="text">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * Use cases section with practical scenarios
 */
interface UseCasesSectionProps {
  useCases: UseCase[];
}

function UseCasesSection({ useCases }: UseCasesSectionProps) {
  const t = useTranslations();
  if (!useCases || useCases.length === 0) return null;

  return (
    <section
      className="mt-10"
      data-testid="tool-page-use-cases"
      aria-labelledby="use-cases-heading"
    >
      <h2
        id="use-cases-heading"
        className="text-2xl font-bold text-[hsl(var(--color-foreground))] mb-6"
      >
        {t('tools.useCases')}
      </h2>
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        data-testid="use-cases-grid"
      >
        {useCases.map((useCase, index) => (
          <Card
            key={index}
            variant="default"
            className="glass-card hover:shadow-lg transition-all duration-300"
            data-testid={`use-case-${index}`}
          >
            <div className="flex items-start gap-4">
              <div
                className="flex-shrink-0 w-12 h-12 rounded-xl bg-[hsl(var(--color-secondary)/0.5)] flex items-center justify-center"
                aria-hidden="true"
              >
                {/* We can map icons here too if needed, for now using a generic check */}
                <div className="w-6 h-6 text-[hsl(var(--color-secondary-foreground))] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-[hsl(var(--color-foreground))] mb-1">
                  {useCase.title}
                </h3>
                <p className="text-sm text-[hsl(var(--color-muted-foreground))]">
                  {useCase.description}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

/**
 * FAQ section with common questions and answers
 */
interface FAQSectionProps {
  faq: FAQ[];
}

function FAQSection({ faq }: FAQSectionProps) {
  const t = useTranslations();
  const [openIndexes, setOpenIndexes] = useState<Record<number, boolean>>({});

  if (!faq || faq.length === 0) return null;

  const toggleIndex = (index: number) => {
    setOpenIndexes(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <section
      className="mt-20 py-12 border-t border-[hsl(var(--color-border))]/60 animate-in fade-in"
      data-testid="tool-page-faq"
      aria-labelledby="faq-heading"
      itemScope
      itemType="https://schema.org/FAQPage"
    >
      <div className="text-center mb-12">
        <h2
          id="faq-heading"
          className="text-3xl font-extrabold tracking-tight text-[hsl(var(--color-foreground))] mb-3"
        >
          {t('tools.faq')}
        </h2>
        <p className="text-[hsl(var(--color-muted-foreground))] max-w-lg mx-auto text-sm font-medium">
          Have questions? Find quick answers about this tool here.
        </p>
      </div>
      <div className="max-w-3xl mx-auto space-y-4" data-testid="faq-list">
        {faq.map((item, index) => {
          const isOpen = !!openIndexes[index];
          return (
            <div 
              key={index}
              className="bg-white border border-[hsl(var(--color-border))]/60 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md hover:border-[hsl(var(--color-primary))]/20"
              itemScope
              itemProp="mainEntity"
              itemType="https://schema.org/Question"
            >
              <button
                onClick={() => toggleIndex(index)}
                className="w-full flex items-center justify-between p-6 text-left font-bold text-base sm:text-lg text-[hsl(var(--color-foreground))] cursor-pointer select-none"
                aria-expanded={isOpen}
              >
                <span itemProp="name">{item.question}</span>
                <ChevronDown className={`w-5 h-5 text-[hsl(var(--color-muted-foreground))] transition-transform duration-300 shrink-0 ml-4 ${isOpen ? 'rotate-180 text-[hsl(var(--color-primary))]' : ''}`} />
              </button>
              
              <div 
                className={`transition-all duration-300 ease-in-out ${
                  isOpen ? 'max-h-[500px] border-t border-[hsl(var(--color-border))]/30 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                }`}
              >
                <div 
                  className="p-6 text-sm text-[hsl(var(--color-muted-foreground))] leading-relaxed bg-[hsl(var(--color-background))]/30"
                  itemScope 
                  itemProp="acceptedAnswer" 
                  itemType="https://schema.org/Answer"
                >
                  <p itemProp="text">{item.answer}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Related tools section
 */
interface RelatedToolsSectionProps {
  tools: Tool[];
  locale: string;
  localizedRelatedTools: Record<string, { title: string; description: string }>;
}

function RelatedToolsSection({ tools, locale, localizedRelatedTools }: RelatedToolsSectionProps) {
  const t = useTranslations();
  if (!tools || tools.length === 0) return null;

  return (
    <section
      className="mt-10"
      data-testid="tool-page-related-tools"
      aria-labelledby="related-tools-heading"
    >
      <h2
        id="related-tools-heading"
        className="text-2xl font-bold text-[hsl(var(--color-foreground))] mb-6"
      >
        {t('tools.relatedTools')}
      </h2>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        data-testid="related-tools-grid"
      >
        {tools.map(tool => {
          const localized = localizedRelatedTools[tool.id];
          const toolName = localized?.title || tool.id
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          const IconComponent = getToolIcon(tool.icon);
          const categoryName = t(`home.categories.${categoryTranslationKeys[tool.category]}`);

          return (
            <a
              key={tool.id}
              href={getLocalizedPath(`/tools/${tool.slug}`, locale as Locale)}
              className="block group"
            >
              <Card hover clickable className="h-full glass-card transition-all duration-300 group-hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-xl bg-[hsl(var(--color-primary)/0.1)] flex items-center justify-center group-hover:bg-[hsl(var(--color-primary))] transition-colors duration-300"
                    aria-hidden="true"
                  >
                    <IconComponent className="w-6 h-6 text-[hsl(var(--color-primary))] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div>
                    <span className="font-semibold text-[hsl(var(--color-foreground))] block mb-1">
                      {toolName}
                    </span>
                    <span className="text-xs text-[hsl(var(--color-muted-foreground))]">
                      {categoryName}
                    </span>
                  </div>
                </div>
              </Card>
            </a>
          );
        })}
      </div>
    </section>
  );
}

export default ToolPage;
