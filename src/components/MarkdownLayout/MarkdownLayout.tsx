import * as React from 'react';
import { useContext, useState } from 'react';
import { ModuleInfo } from '../../models/module';
import { graphql, useStaticQuery } from 'gatsby';
import UserDataContext from '../../context/UserDataContext/UserDataContext';
import { graphqlToModuleLinks } from '../../utils/utils';
import MarkdownLayoutContext from '../../context/MarkdownLayoutContext';
import TableOfContentsSidebar from './TableOfContents/TableOfContentsSidebar';
import TableOfContentsBlock from './TableOfContents/TableOfContentsBlock';
import { SolutionInfo } from '../../models/solution';

import ConfettiContext from '../../context/ConfettiContext';
import ForumCTA from '../ForumCTA';
import { SettingsModalProvider } from '../../context/SettingsModalContext';
import { ContactUsSlideoverProvider } from '../../context/ContactUsSlideoverContext';
import MobileSideNav from './MobileSideNav';
import DesktopSidebar from './DesktopSidebar';
import MobileAppBar from './MobileAppBar';
import NavBar from './NavBar';
import NotSignedInWarning from './NotSignedInWarning';
import ModuleHeaders from './ModuleHeaders';
import ModuleProgressUpdateBanner from './ModuleProgressUpdateBanner';
import { updateLangURL } from '../../context/UserDataContext/properties/userLang';
import { ProblemSuggestionModalProvider } from '../../context/ProblemSuggestionModalContext';

const ContentContainer = ({ children, tableOfContents }) => (
  <main className="relative z-0 pt-6 lg:pt-2 focus:outline-none" tabIndex={0}>
    <div className="mx-auto">
      <div className="flex justify-center">
        {/* Placeholder for the sidebar */}
        <div
          className="flex-shrink-0 hidden lg:block order-1"
          style={{ width: '20rem' }}
        />
        {tableOfContents.length > 1 && (
          <div className="hidden xl:block ml-6 w-64 mt-48 flex-shrink-0 order-3">
            <TableOfContentsSidebar tableOfContents={tableOfContents} />
          </div>
        )}
        <div className="flex-1 max-w-4xl px-4 sm:px-6 lg:px-8 w-0 min-w-0 order-2 overflow-x-auto">
          <div className="hidden lg:block">
            <NavBar />
            <div className="h-8" />
          </div>

          {children}

          <div className="pt-4 pb-6">
            <NavBar alignNavButtonsRight={false} />
          </div>
        </div>
      </div>
    </div>
  </main>
);

export default function MarkdownLayout({
  markdownData,
  children,
}: {
  markdownData: ModuleInfo | SolutionInfo;
  children: React.ReactNode;
}) {
  const { userProgressOnModules, setModuleProgress, lang } = useContext(
    UserDataContext
  );
  React.useEffect(() => {
    if (lang !== 'showAll') {
      updateLangURL(lang);
    }
  }, [lang]);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const moduleProgress =
    (userProgressOnModules && userProgressOnModules[markdownData.id]) ||
    'Not Started';

  const tableOfContents =
    lang in markdownData.toc ? markdownData.toc[lang] : markdownData.toc['cpp'];

  const data = useStaticQuery(graphql`
    query {
      allMdx(filter: { fileAbsolutePath: { regex: "/content/" } }) {
        edges {
          node {
            frontmatter {
              title
              id
              author
            }
            fields {
              division
              gitAuthorTime
            }
            problems {
              uniqueID
              solID
            }
          }
        }
      }
    }
  `);
  const moduleLinks = React.useMemo(() => graphqlToModuleLinks(data.allMdx), [
    data.allMdx,
  ]);
  // console.log(moduleLinks);

  const showConfetti = useContext(ConfettiContext);
  const handleCompletionChange = progress => {
    if (moduleProgress === progress) return;
    setModuleProgress(markdownData.id, progress);
    if (
      moduleProgress !== 'Complete' &&
      (progress === 'Practicing' || progress === 'Complete')
    ) {
      showConfetti();
    }
  };

  // Scroll behavior smooth was causing a number of issues...
  // make sure to test that clicking autogenerated anchors scrolls properly before re-enabling
  // React.useEffect(() => {
  //   document.querySelector('html').style.scrollBehavior = 'smooth';
  //   return () => (document.querySelector('html').style.scrollBehavior = 'auto');
  // }, []);

  // console.log(markdownData)
  // console.log(moduleLinks)
  // console.log(userProgressOnProblems)
  const problemIDs = [];
  const activeIDs = [];
  const appearsIn = [];
  let uniqueID = '';
  const probToModule = {};

  for (const moduleLink of moduleLinks) {
    for (const problem of moduleLink.probs) {
      const uniqueID = problem.uniqueID;
      probToModule[uniqueID] = module.id;
    }
  }

  if (markdownData instanceof ModuleInfo) {
    activeIDs.push(markdownData.id);
    const ind = moduleLinks.findIndex(link => link.id === markdownData.id);
    // oops how to assert not -1
    for (const problem of moduleLinks[ind].probs) {
      const uniqueID = problem.uniqueID;
      problemIDs.push(uniqueID);
    }
  } else {
    moduleLinks.forEach(link => {
      for (const problem of link.probs) {
        if (problem.solID === markdownData.id) {
          activeIDs.push(link.id);
          appearsIn.push(link.url);
          uniqueID = problem.uniqueID;
        }
      }
    });
  }

  // @ts-ignore
  return (
    <MarkdownLayoutContext.Provider
      value={{
        markdownLayoutInfo: markdownData,
        sidebarLinks: moduleLinks,
        activeIDs,
        appearsIn,
        uniqueID,
        isMobileNavOpen,
        setIsMobileNavOpen,
        moduleProgress,
        handleCompletionChange,
      }}
    >
      <SettingsModalProvider>
        <ContactUsSlideoverProvider>
          <ProblemSuggestionModalProvider>
            <MobileSideNav />
            <DesktopSidebar />

            <div className="w-full">
              <MobileAppBar />

              <ContentContainer tableOfContents={tableOfContents}>
                <NotSignedInWarning />

                <ModuleHeaders
                  problemIDs={problemIDs}
                  moduleLinks={moduleLinks}
                />

                <div className={tableOfContents.length > 1 ? 'xl:hidden' : ''}>
                  <TableOfContentsBlock tableOfContents={tableOfContents} />
                </div>

                {children}

                <ModuleProgressUpdateBanner />

                <ForumCTA />

                {/*<div className="my-8">*/}
                {/*  <ModuleFeedback markdownData={markdownData} />*/}
                {/*</div>*/}
              </ContentContainer>
            </div>
          </ProblemSuggestionModalProvider>
        </ContactUsSlideoverProvider>
      </SettingsModalProvider>
    </MarkdownLayoutContext.Provider>
  );
}
