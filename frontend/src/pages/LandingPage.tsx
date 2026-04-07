import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, Target, Shield, CheckCircle } from 'lucide-react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';

export default function LandingPage() {
  const { login, loginStatus } = useInternetIdentity();

  const features = [
    {
      icon: Users,
      title: 'Group Management',
      description: 'Create and manage agriculture venture groups with ease. Invite members and track participation.',
    },
    {
      icon: TrendingUp,
      title: 'Contribution Tracking',
      description: 'Monitor all financial contributions with detailed records and automated status updates.',
    },
    {
      icon: Target,
      title: 'Milestone Progress',
      description: 'Set and track project milestones with photo documentation and completion status.',
    },
    {
      icon: Shield,
      title: 'Secure & Transparent',
      description: 'Built on Internet Computer with Internet Identity for secure, decentralized authentication.',
    },
  ];

  const impactPoints = [
    'Democratizing agriculture',
    'Building real community value',
    'Elevating Africa\'s nutrition',
    'Creating the continent\'s leading agricultural infrastructure',
  ];

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900 text-white">
        <div className="absolute inset-0 opacity-20">
          <img
            src="/assets/generated/agriculture-hero.dim_1200x600.jpg"
            alt="Agriculture background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative container mx-auto px-4 py-24 md:py-32 lg:py-40">
          <div className="max-w-5xl mx-auto">
            <div className="text-center space-y-8">
              {/* Main Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight leading-tight">
                Feed the Future.
                <span className="block mt-2">Build the Continent.</span>
                <span className="block mt-2 text-emerald-300">Together.</span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl md:text-2xl lg:text-3xl font-light text-green-100 max-w-4xl mx-auto leading-relaxed">
                Agri-Ventures empowers Africa's youth and communities to transform agriculture through innovation, collaboration, and shared opportunity.
              </p>

              {/* Impact Points */}
              <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto pt-8">
                {impactPoints.map((point, index) => (
                  <div key={index} className="flex items-start gap-3 text-left">
                    <CheckCircle className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-1" />
                    <span className="text-lg md:text-xl font-medium text-green-50">{point}</span>
                  </div>
                ))}
              </div>

              {/* Call to Action */}
              <div className="pt-8 space-y-6">
                <p className="text-2xl md:text-3xl font-semibold text-emerald-200">
                  Join the movement. Own the future.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button
                    size="lg"
                    onClick={login}
                    disabled={loginStatus === 'logging-in'}
                    className="text-lg px-10 py-6 bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl hover:shadow-2xl transition-all"
                  >
                    {loginStatus === 'logging-in' ? 'Connecting...' : 'Join Now'}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-lg px-10 py-6 bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm"
                  >
                    Learn More
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools to manage your agriculture venture groups from start to finish
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary transition-colors">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Start Your Venture?</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
            Join the platform today and start managing your agriculture ventures with transparency and efficiency.
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={login}
            disabled={loginStatus === 'logging-in'}
            className="text-lg px-8"
          >
            {loginStatus === 'logging-in' ? 'Connecting...' : 'Get Started Now'}
          </Button>
        </div>
      </section>
    </div>
  );
}
