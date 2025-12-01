import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'

interface AlphaWooMagicLinkProps {
  loginUrl: string
  userEmail: string
}

export const AlphaWooMagicLink = ({
  loginUrl = 'https://alphawoo.com',
  userEmail = 'user@example.com',
}: AlphaWooMagicLinkProps) => {
  return (
    <Html>
      <Head />
      <Preview>Log in to your Revenue Dashboard</Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                zinc: { 50: '#fafafa', 200: '#e4e4e7', 500: '#71717a', 900: '#18181b' },
                indigo: { 600: '#4f46e5' },
                emerald: { 600: '#059669' },
              },
            },
          },
        }}
      >
        <Body className="bg-zinc-50 my-auto mx-auto font-sans">
          <Container className="border border-solid border-zinc-200 rounded my-[40px] mx-auto p-[20px] max-w-[465px] bg-white">
            <Section className="mt-[32px] text-center">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg mx-auto mb-4" />
              <Heading className="text-zinc-900 text-[24px] font-normal text-center p-0 my-[30px] mx-0">
                <strong>AlphaWoo</strong> Revenue Insurance
              </Heading>
            </Section>

            <Section className="text-center mt-[32px] mb-[32px]">
              <Text className="text-zinc-500 text-[14px] leading-[24px]">
                You requested a secure login link for <strong>{userEmail}</strong>.
              </Text>

              <Button
                className="bg-zinc-900 rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3 mt-[12px]"
                href={loginUrl}
              >
                Access Revenue Dashboard
              </Button>
            </Section>

            <Section>
              <Text className="text-zinc-500 text-[12px] leading-[24px] text-center">
                This link expires in 24 hours. If you didn&apos;t request this, you can safely ignore this email.
              </Text>
              <Text className="text-zinc-500 text-[12px] leading-[24px] text-center mt-4">
                <Link href={loginUrl} className="text-zinc-500 underline">
                  {loginUrl}
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default AlphaWooMagicLink
