---
layout: default
title: About
permalink: /about/
hide_title: true
---

<div class="profile-container">
  <div class="profile-image-section">
    <img src="/assets/images/overlook_2.jpg" alt="Mark Paral" class="profile-image">
    <div class="profile-org-logos">
      <img src="/assets/images/purdue_logo.png" alt="Purdue University" class="org-logo">
      <img src="/assets/images/stanford_logo.png" alt="Stanford University" class="org-logo">
    </div>
  </div>
  <div class="profile-main">
    <h1 class="profile-title">I'm Mark!</h1>
    <p class="profile-bio">
      I am an aeronautical and astronautical engineer working on GNC and systems design for satellites. Previously, I obtained my bachelor's from Purdue and my master's from Stanford. If you want to connect, please reach out!
    </p>
    <div class="profile-buttons">
      <a href="mailto:markwparal@gmail.com" class="profile-btn email-btn" title="Email"><span>✉️</span></a>
      <a href="https://www.linkedin.com/in/mark-paral" class="profile-btn linkedin-btn" target="_blank" rel="noopener noreferrer" title="LinkedIn"><span>in</span></a>
      <a href="https://scholar.google.com/citations?hl=en&user=uE5ubPYAAAAJ" class="profile-btn scholar-btn" target="_blank" rel="noopener noreferrer" title="Google Scholar"><span>🎓</span></a>
    </div>
  </div>
</div>

<style>
.profile-container {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 32px;
  margin-top: 40px;
}
.profile-image-section {
  flex: 0 0 auto;
  margin-left: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.profile-image {
  width: 180px;
  height: 180px;
  object-fit: cover;
  border-radius: 24px;
  border: none;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}
.profile-org-logos {
  display: flex;
  gap: 18px;
  margin-top: 18px;
  justify-content: center;
}
.org-logo {
  width: 64px;
  height: 64px;
  object-fit: contain;
  border-radius: 8px;
  background: transparent;
  border: none;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.profile-main {
  flex: 1 1 300px;
  min-width: 250px;
}
.profile-title {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 2.2em;
  color: var(--text-secondary);
}
.profile-bio {
  font-size: 1.1em;
  color: var(--text-primary);
  margin-bottom: 24px;
}
.profile-buttons {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}
.profile-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 6px;
  font-size: 1em;
  font-weight: 600;
  text-decoration: none;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1.5px solid var(--border-color);
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  transition: background 0.2s, color 0.2s, border 0.2s;
}
.profile-btn:hover {
  background: var(--link-hover-bg);
  color: var(--link-color);
  border-color: var(--link-color);
}
.email-btn span {
  font-size: 1.2em;
}
.linkedin-btn span {
  font-family: Arial, sans-serif;
  font-weight: bold;
  font-size: 1.1em;
  background: #0077b5;
  color: #fff;
  border-radius: 3px;
  padding: 2px 6px;
  margin-right: 2px;
}
.scholar-btn span {
  font-size: 1.2em;
}
@media (max-width: 700px) {
  .profile-container {
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }
  .profile-main {
    min-width: 0;
  }
  .profile-image-section {
    margin-left: 0;
  }
  .profile-org-logos {
    gap: 10px;
  }
}
</style>